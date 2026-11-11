# Implementation Working Notes (Implementation Engineer, autobyteus-461)

These notes let the work resume after a context reset. They are not a deliverable; `implementation-handoff.md` is.

## Basis

- Design `SR-023`, contract revision 6, ARCH-REV-007 Pass (design commit `27a6487265`). Base `827f1e68dc`.
- SR-023 over SR-021: the run's own `delegatedFrom` (written once; equal to its entries); `isDelegated` / `isPeerStarted`
  (contract §2.4, readers table); `DelegationTree` (collaboration, §2.6) replaces Task-side questions and `TaskRunIndex`;
  the Task side calls `entriesChanged(taskId)` synchronously in the Task's ordered change; gate-head re-check reads the
  port's `isOpen`; `TaskMessageScope` → `CrossRunMessageDelivery` (order only; the rule is `DelegationTree.canMessage`).
  Contract §13 has exact JSON per case: use it for fixtures.
- Tests the reviewer asked to keep: local delegated run messages its delegator by run ID through DS-2 + idle shutdown +
  runtime-switch eligible; closure vs. assigner's message interleaved both orders; run copy == entry copy after
  delegation, follow-up and migration; DS-10 predecessor-FAILED cases.
- Steps 1 … 9 ship together; intermediate commits may leave suites red. Full suite green only at the last code commit.

## Authority (the user, via the Solution Designer, 2026-11-11)

- The contract (`target-collaboration-contract.md`) and its executable model (`evidence/collaboration-model/`) are the
  authority; the code is refactored to them. The base code is NOT the reference. Any model/code difference: send the
  point to the Solution Designer (it decides on the data model's merits, updates contract + model), then implement.

## Decisions taken in implementation (each goes into the handoff)

- I-1 The agent-facing `assignedBy` in `list_project_tasks` assignments stays (no change to what an agent reads); filled
  from `delegatedFrom.delegatorAgentRunId`.
- I-2 `DelegationTree.runOfAgent` is async: entry agents, standalone delegating runs and peer members from the entries;
  team/org agents read once from the run's own file through a bound `RunAgentsReader`, on the first miss; org runs read
  again on a miss. No startup pass over own files.
- I-3 Port: `taskIdsWithEntries()`, `entriesOf(taskId)` (each run's last entry per Task, from memory), `isOpen`;
  listener `TaskEntriesListener.entriesChanged(taskId)` called in `swap()` after load and in `forget()`; a listener
  failure is logged (`DELEGATION_TREE_UPDATE_FAILED`) and never fails the write.
- I-4 Closure stop request is per run by its own identity: `TaskExecutionReleaseRequest(run)`; a peer's run is logged
  `TASK_AGENT_RESOURCE_FENCED_REMOTE` and not requested.
- I-5 Task root view (GraphQL `TaskRootView`, change feed) field `hostRoot` → `delegatingRun`.
- I-6 Child rows (`openChildrenOf`) are ordered by the child's first delegation; one row per child, for its newest open Task.
- I-8 Naming (DESIGN.md rule 10, the Solution Designer 2026-11-11): new stored fields keep their stored names in code:
  `delegatedFrom { delegatingRun, delegatorAgentRunId }`, `nodeId`, `members` (flat on the entry, `TaskRunEntry`,
  `DelegatedChild`, `ReleasableRun`). No new mapping; older mappings are FU-007 (not this ticket).
- I-9 Run file `DelegatedFrom` = `{ delegatingRun, delegatorAgentRunId?, nodeId? }` (`DelegatingRunRef`),
  `isDelegated`, `isPeerStarted`, `peerDelegatedFromOf` in `agent-run-metadata-types.ts`; parser
  `parseDelegatingRunRef` in `delegated-from-schema.ts`. Agent metadata gains `address`, `launchSource`.
  Peer wire field `coordinatingRun` → `delegatingRun` (DESIGN.md rule 9: same release on both nodes).
- I-7 `deleteAdHocTasksHostedBy` → `deleteAdHocTasksDelegatedFrom(run)` (Tasks with no Project assigned by that run; same behavior).

## Open escalation

- DI-1 → TC-12. SR-024 (rooted at the delegation address) is WITHDRAWN. SR-025 (`73ece4bec4`, answers ARCH-REV-008 AR-018):
  every team run rooted at `/`; delegation address = Task entry `recipientAddress`, now on EVERY entry (migration
  fills non-assigned from the run's `taskAgent.address`); step 4 rebases member + handoff addresses (drop the prefix);
  a handoff `to` outside the team (`/Teacher`) kept as written (resolved when sent, §10.3 step 2); peer path unchanged.
  Contract §10.7 lists every address case A1–A6, B1–B5, C1–C6, D1–D4, E1–E4 (one test per row); D3, A5 change behavior.
  ON HOLD until architecture review round 9: TC-12 and addressing work. The migration's `convertTeamRunFile` in the
  working tree is the WITHDRAWN mounted version: rewrite to the `/` rebase; add the `recipientAddress` fill to
  `task-record-conversion.ts`; schema: handoff `to` as stored, member `launchSource` optional, `taskExecutions` not
  required, `followsTeam` + `task-agent-team-tree-schema.ts` removed. Fixture/test for team E assert mounted shape: rewrite.
  Migration files are uncommitted (registry edit too).

- SR-026 (`44a520f749`): contract is one file; sections renumbered (rules §2, on disk §3, tree §4, cases §5, migration
  E1–E12 §6). TC-13 (contract §3.4, design DS-10 step 5b): every agent run's message log lives in its own folder
  `memory/agents/<id>/communication_messages_*.jsonl` (user-started runs today log in `agents/<id>/collaboration/`,
  42 delegated in `agents/<id>/`). Migration moves the 8 append-only logs up; an unconverted JSON log of an unfinished
  `20261018_…` item stays. Runtime: the standalone root's own log path changes to the run folder (step 9 area).
  Tests: one per contract §5 case ID (DL-0…DL-11, A-1…C-4, R-1…R-10, E-1…E-4, T-1…T-7) + TC-13.
  User reads, then architecture review round 9. TC-12/addressing/TC-13 still on hold until then.

- SR-030 (`3fdacb751e`): peer team `members` by team-local addresses (`/lead`). Done: peer starter answer (commit
  after f709fe34b2); migration step 3 drops the prefix (`teamLocal` in task-record-conversion.ts, uncommitted with the
  migration). Contract §5.1 walks the PTM as states S0–S15; closure/deletion stops only runs with no other open Task;
  after a reopen only an `assigned` entry is continued, by its assigner (both = existing code rules).

- SR-031 (`6dc9abddf0`): executable model `evidence/collaboration-model/` (model.py rules, stories.py 37 steps,
  walkthrough.py → collaboration-walkthrough.md disk states; `walkthrough.py --check target-collaboration-contract.md`
  stays green). It is the implementation's reference. Rules: (2) assigner continuation reopens only the run's last
  `assigned` entry = base; (3) peer message header `… sender run id "<id>" on node "<node>".` = base.
  ACCEPTANCE TEST (design): drive each story through real tools (two servers for the peer), after every step compare the
  server's files with the walkthrough state (run IDs/times/texts mapped; `…` matches anything).
  UQ-1 sent 2026-11-11: model rule 1 (sub-work → most recently linked entry, must be open) vs base/DS-1 (newest open
  entry); model assigns `task_key` from a run with an open Task vs base refusal OWNED_SENDER. ANSWERED SR-032
  (`9751caa6da`): both base readings are the contract (§2.4); model corrected; walkthrough S20 = the refusal. No code change.
  Any further model/code difference: send the same way.

- ARCH-REV-009 FAILED (SR-034, `88ec7903e6`). AR-019: TC-12 revised (teams rooted at `/`, members re-addressed and
  told) and DL-11 (new copy instead of the own-team refusal) change what agents read → the user decides. HOLD: TC-12
  rebasing, the members' new-address notice, DL-11. Alternative being asked: root a delegated team at its delegation
  address (reader + handoff-compiler changes). Everything else continues.
  AR-020 (model fixed, S19): on Task closure a peer's run is FENCED, not stopped, as the base `closureFence`: keep it
  (release already logs FENCED_REMOTE and requests no stop; step 4 must keep the message fence both ways for a closed
  peer entry, with the base's fence text).
  Address step 2 (the assigning run's standing agents) applies to a run WITH Task entries, not to every run with
  `delegatedFrom`.

- SR-035 (`f86ad20aa4`): the user chose option 1 for AR-019: resume TC-12 rebasing to `/`, the one-time new-address
  notice, DL-11 new copy (requirements-doc.md:76 approved exception). ARCH-REV-010 PASS on SR-035 (contract rev. 8 +
  model). RECONCILE everything on the branch with contract rev. 8 + walkthrough (41 states): rooting at `/`,
  `recipientAddress` on EVERY entry (E5 fill from taskAgent.address), closure fence of a peer's run (keep base
  `closureFence`). UQ-2 ANSWERED SR-036 (`218e1d3dde`), ARCH-REV-011 PASS, order fixed in `c613ddad22`: NOTHING stored (no marker, no
  platform notice, no migration field). Address resolution (contract §2.3, A-5, A-6, state S24; texts in model.py
  `resolve`): step 1 own team → step 2 the assigner's standing agents → THEN the old-address correction for a run with
  Task entries in a delegated team: address = one of its entries' `recipientAddress` + "/" + a member's address →
  COLLABORATION_TARGET_NOT_FOUND "<address> is no longer an address: your team is addressed from its own root. Use
  <member address>."; address == the `recipientAddress` itself → "… Your team as a whole has no address; its
  coordinator is <coordinator address>." (exact texts: model.py).

- Remaining TC-12 follow-through: DL-11 (delegate_task to own team definition from a delegated team → new copy, as
  in a user-started team); old-address correction in address resolution (after step 2); team members' launchSource
  recorded by DelegatedRunStarter for teams; remove `task-agent-team-tree-schema.ts`, `followsTeam` readers (step 9);
  runtime TC-13: the standalone root's own log path → `agents/<id>/communication_messages_*` (step 9);
  test "a member with its own launch keeps it after a team Settings save".

## Progress

| Step | State | Commit |
| --- | --- | --- |
| 1a-1c Task entry model, Task side, DelegationTree, run delegatedFrom, composition | done | 15574e1ba5 |
| 1d Migration DS-10 (contract rev. 8 §6 E1–E12, TC-12 rooted at `/`, E5, TC-13) + schema + recipientAddress everywhere | done | f7bc67d248 |
| 2 DelegatedRunStarter, idle shutdowns | done (team member `launchSource` waits for TC-12 schema) | eee70a1ae4 |
| 3 TaskDelegation, every root | new runs local + peer done; follow-up Task (toExistingRun) | f709fe34b2, 91d078b549, ee27b3f230 |
| 4 CrossRunMessageDelivery, router, address steps | run ID route; §2.3 step 2 then SR-036 correction; §2.5 reaching address; §3.3 address at first delegation | 5b0d2a5aef, 51b054fd02 |
| DL-11 / U7 | SR-037: own definition refused as today (no code change; test) | cd9572787f |
| 5 Closure / reopen / delete by identity | TaskRunControl (ordinary Stop + row, model `stop`); T-3 deletion removes the record after closing+stopping; R-9 live refusal; reopen in step 4 | 5f2b155d3b |
| Peer links from Task entries (PeerRunLink, peerChildrenOf), fence via closed entry | done | a2ef64bae1 |
| SR-038 peer launches read from peer summary; team member launchSource recorded | done | 11bb9245d7 |
| 6 Stop: own parts only | | |
| 7 Views, DelegatedRunCommands, connect, web | | |
| 8 Restart resume, notice | | |
| 9 Removal | | |
| 10 Documents | | |

Files: `src/agent-collaboration/delegation/delegation-tree.ts`, `delegation-tree-binding.ts`;
tests `tests/unit/agent-collaboration/delegation/delegation-tree.test.ts`, `tests/unit/projects/task-run-entries.test.ts`,
helper `tests/helpers/delegation-tree-of.ts`. Projects + project-task tool tests: 458 pass.
Test files with baselined type errors (missing `recipientAddress` on assigned links): get-project-task-tool (3),
project-task-business-results (5) — check the gate at the end of step 1.

## Step 3 plan (TaskDelegation)

- `agent-collaboration/execution/task/task-delegation.ts`: `toNewRun(sender identity, spawn input, resolvePlacement)`.
  Order (I-10): prepare work (role from `tree.currentTaskOf(sender run)`: open → subWork, `task_id` refused
  OWNED_SENDER; else assigned to saved Task or ad-hoc) → folder → placement (root's existing recipients) → create the
  run INERT via `DelegatedRunStarter` (agent: PREPARED; team: created, not started; as the peer path: plan creates the
  run first) → `linkNewTaskExecution` (delegatedFrom = sender's run + sender; recipientAddress = placement address) →
  on link failure cancel/terminate the new run → deliver the work packet to the new run's root
  (`acceptWorkPacket`, generalized from `acceptRemoteWorkPacket`: post `buildTaskAssigneeWorkPacket` as first input) →
  failure: `markFailed` + terminate → `markStarted` → routing decision record → same outcome/texts as today.
- `toExistingRun` (follow-up Task) needs DS-2 delivery: implement with step 4.
- Peer placement (`remote_agent`): the link goes into the Task entry (`nodeId`, `members`, `recipientAddress`), not a tree.
- Roots: standalone `delivery.delegateToNewCopy`, team/org task-delegation adapters → TaskDelegation.

## Readers decisions (per file; fill as done)

| File | Field | Decision |
| --- | --- | --- |
| projects/domain/task-execution-resources.ts | hostRoot, assignedBy | `delegatedFrom`; `assignerOf(entry)` = delegator |
| projects/stores/task-execution-resource-schema.ts | hostRoot, assignedBy, role | strict new shape; `nodeId`/`members` top-level for peer |
| projects/services/task-execution-resource-service.ts | hostRoot | per-host indexes removed; entry reads + notice |
| projects/services/project-task-service.ts | hostRoot, assignedBy | port methods; delete ad-hoc by delegating run |
| projects/runtime/task-execution-resource-release.ts | hostRoot | per run identity; peer fenced |
| projects/services/task-root-view-builder.ts, domain/models.ts, changes/project-change-messages.ts, api/graphql/types/project-tasks.ts | hostRoot | `delegatingRun` |
| agent-tools/project-tasks | assignedBy | unchanged agent-facing name, value from delegatedFrom (I-1) |
| standalone-agent-run-root.ts:148 (backLink) | delegatedFrom | `peerDelegatedFromOf` (isPeerStarted) |
| standalone-agent-run-root.ts:153 (host idle) | delegatedFrom | presence = isDelegated (step 2 renames the shutdown) |
| standalone-agent-run-root-manager.ts:208-211 (stored link check) | delegatedFrom | `peerDelegatedFromOf` |
| team-run-remote-links.ts:23 | delegatedFrom | `peerDelegatedFromOf` |
| standalone-agent-run-eligibility.ts:16 | delegatedFrom | `!isPeerStarted` (local delegated run may switch runtime) |
| root-team-run.ts:201 (idle) | delegatedFrom | presence = isDelegated |
| remote-endpoint.ts, remote-run-links.ts | delegatedFrom | `PeerDelegatedFrom`; transmission names `delegatingRun` |
| standalone-agent-run-root-manager.ts:447-449, standalone-root-package-store readMessages backLink; coordinating-tree-shapes storedBackLink | delegatedFrom | removed with the tree composition (step 9) |

## Notes for the handoff (step 4/5)
- Agent standing without stored address: code returns none (model derives from definition id). Not reachable: every assigner agent run has its address fixed at its first delegation (§3.3) and every delegated agent run has it from the starter; migrated runs get it from E8.
- R-9 for a stopped member of a run no Task relates: refused as "No running agent has the run id …" (the router cannot know a stopped team's members without the tree); a live one gets the different-Task text.
- Hosting-era failing unit tests (158, same set before/after steps 4–5): root-task-*, task-execution-resource-*, task-reactivation-backends, root-communication-*, closed-delegated-run-reader, history catalog (3), team-run-history-service (1) — rewrite or removal in steps 6–9.

## Plan for steps 6–9 (root by root)
Standalone root first: no tree file (TC-8); state = host handle + own message log (TC-13 path) + gate + peer links/back-link + catalog collaborators + delivery (TaskDelegation, CrossRun, remote) + idle shutdown; Stop = host only. Remove RootTaskExecutionLifecycle, adapter, index of hosted copies, tree schema/mutator/path, persistence coordinator tree part, location service hosted members, delegated launches, stopDelegatedExecution. Views: own parts + DelegationTree.openChildrenOf rows (step 7), DelegatedRunCommands. Then team root, then org root, then shared hosting files, then views/web, restart (step 8).
Hosting-era tests failing (to delete/rewrite in 9): root-task-*, task-execution-resource-*, task-reactivation-backends, root-communication-*, closed-delegated-run-reader (3), history catalog (3), team-run-history-service (1), team-root-delegation-and-messaging (9), team-root-delegated-launch-selection (1), team-root-launch-notes (1), remote-messaging-owners (3), remote-collaboration others (~20).

## Step 7 view design (implementation reading of DS-8, U-B: "the web keeps today's rows")
- Each root view's DTO keeps its shape: the children list (`taskExecutions` in the view DTOs) is built from `DelegationTree.openChildrenOf(run)` + each child's OWN file (agent: run_metadata → agentDefinitionId, launch, launchSource, platformAgentRunId; team: its team file → members, sources, handoffs, default launch), one hop (nested `taskExecutions: []`). Peer children stay `remote_task_executions` (PeerRunLink).
- Statuses of local children: from their own live roots (TaskRunControl-like status per agent; offline when not live).
- Live output while viewed: a `LocalChildObservation` (like RemoteRunObservation) subscribes to the child roots' events and republishes as the parent's `agent_presentation`.
- Commands from a child row: `DelegatedRunCommands` → child's own root (message: resolveOrRestore; interrupt/approval: live only; Stop: run service).
- Conversation reads of a child: its own run's projection (agent run view / team member view).
- Standalone root rewrite: host-only root; no tree file (TC-8); log at `memory/agents/<id>/communication_messages*` (TC-13); `ownedTaskOf` = the run's own current Task from DelegationTree.

## Progress after b68fd69b56 (standalone root host-only)
Done for agent runs: steps 6, 7 (server view: child rows from tree + own files; DelegatedRunCommands; no host start on connect; child projections via DelegatedChildLocations), 9 (standalone hosting files removed). Commits: bc87525f87 (TC-13 log path), b68fd69b56.
TODO next:
1. Rewrite tests on a host-only harness: tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts, standalone-root-inherited-launch.test.ts, helpers/standalone-root-harness.ts; tests for DelegatedRunCommands, delegatedChildrenDtos, DelegatedChildLocations, ClosedDelegatedRunReader (rewritten), run-last-activity delegated part.
2. Live child-row updates in the parent view (child added/closed while viewed) and live child output/statuses (LocalChildObservation) — not built yet; snapshot only.
3. Team root (root-team-run.ts) and org root (agent-org-run.ts) the same way; then delete shared hosting: agent-collaboration/execution/task/root-task-*, task-execution-tree-membership, task-execution-closure, existing-copy-target, root-task-dispatch, root-task-execution-resource-scope, adapters (team/org), registries, task-agent-team-tree*, task-execution-tree-split, remote-task-execution-links, open-delegated-run-source, task-agent-own-files/logs (check readers), coordinating-tree-shapes taskExecutions parts, team/org tree taskExecutions/remoteTaskExecutions fields, DelegatedLaunchSelectionService delegated parts.
4. Step 8 restart resume bottom-up + notice; step 10 docs; handoff docs.
Store/peer tests now failing to load due to deleted standalone modules (hosting-store tests): member-pending-switch-records, task-agent-message-logs, open-delegated-run-trees, remote-task-execution-links, task-agent-own-run-stores, remote-link-walkers (standalone part), standalone-remote-delegation.

## After team root (commit see log): tests to rewrite/remove with step 9
agent-team-execution: flat-team-member-release-independence (import), root-team-run-termination, team-root-delegated-launch-selection, team-root-delegation-and-messaging (9), team-root-launch-notes; services/agent-streaming: agent-collaboration-stream-handler (import), agent-collaboration-task-lifetime-projection (import), collaboration-public-tree-projection (import), launch-selection-dto-projection, launch-source-dto-projection (2), team-execution-view-projector (3).
Next: org root (agent-org-run.ts) same way; then delete shared hosting under agent-collaboration/execution/task (root-task-*), registries/flat-team hosted copies, tree taskExecutions/remoteTaskExecutions types & schemas & mutators, task-execution-tree-split, open-delegated-run-source, task-agent-own-files/logs, DelegatedLaunchSelectionService delegated parts; fix/rewrite tests; then step 8 (restart), web check, step 10 docs, handoff.

## After 653cf5bf43: server compiles with 0 errors
Commits since: 7e2ee83757 (standalone tests), 65e9972b60 (team root), 33c33df16d (org root), 653cf5bf43 (shared hosting lifecycle removed).
Remaining step 9 cleanup (dead hosting code still present): delegated launch editing (delegated-launch-selection-command.ts, root-hosted-delegated-launches.ts, team-run-delegated-launch-plan.ts, managers' updateStopped delegatedChanges / delegatedLaunchModelOptions, DelegatedLaunchSelectionService delegated parts); RootAgentExecutionRegistry / RootTeamExecutionDirectory copy parts; task-agent/task-team execution registries + flat-team hosted copies; tree types/schemas/mutators `taskExecutions`/`remoteTaskExecutions`; task-execution-tree-split; open-delegated-run-source; task-agent-own-files/logs; coordinating-tree-shapes; userLaunchSelection readers; followsTeam readers; taskAgent readers (G1); agent-org-task-event-retirement; task-agent-team-tree*.
Then: fix/rewrite failing tests (list in earlier sections), step 8 restart, web check, typecheck baseline gate (scripts/typecheck.mjs), step 10 docs, handoff docs, code review handoff.

## Unit test triage (after 653cf5bf43 + test deletions; full list /tmp/ae461/triage.txt)
Fixed: field renames (coordinatingRun→delegatingRun on the wire/metadata, deleteAdHocTasksDelegatedFrom, entriesOf), app host lifecycle.
Remaining failing files and plan:
- DELETE (subject = hosting): agent-org-delegated-launch-selection, agent-org-new-copy-folder (folder now TaskDelegation; add folder test there), agent-org-task-idle-shutdown, agent-org-task-shutdown-event-retirement, team-root-delegated-launch-selection, team-root-launch-notes (launch notes now TaskDelegation), team-root-delegation-and-messaging, team-run-execution-tree-mutator (hosted copy mutations; keep non-copy cases if any), located-execution-source (agent family), root-communication-baseline-contract(+json).
- FIX: communication-commit-path (build new standalone root), refusal-texts-vocabulary (file list), result-catalogue (remove texts of removed hosting stop), agent-memory-location-service & team-run-physical-scope & team-memory-explorer-service (drop hosted-copy cases), launch-*-dto-projection & collaboration-public-tree-projection (hosted copy DTO), member-pending-switch-records (drop standalone tree part), remote-link-walkers & remote-messaging-owners (drop adapter/lifecycle parts), run-last-activity-reader & standalone-run-token-usage-summary-service (new delegated reader), context-file-agent-collaboration-owner (DelegatedChildLocations), collaboration-participant-messages, collaboration-root-history-* (schema import), stream handler tests, agent-org-stream-handler (zod), agent-org-run-* (config-wire userLaunchSelection, inspection, termination spy, status traversal, collaborators openDelegatedRuns), root-team-run-termination (spy), team-run-history (remoteTaskExecutionDtos signature), delegated-launch-selection-service (2), agent-run-collaboration-statuses (digest from tree), standalone/team-remote-delegation (bind TaskDelegation in harness).

## Session 2026-11-11 afternoon (after compaction)

Done and committed: DS-9 restart (e2d80d6160); integration + migration test triage and type gate (dd8d688fba;
baseline 1180 -> 1017, `node scripts/typecheck.mjs` PASS). Docs step 10 (collaboration_model, GLOSSARY, module docs:
standalone root, team execution, orgs, communication, projects, memory, restart, remote, run_history, token_usage).
TaskWorkerStatusNotice (regression fix: delegated runs tell the Task side their status; base did it from the root
task lifecycle). Web: TaskRoot.hostRoot -> delegatingRun (server GraphQL renamed in step 1; design table line 292
puts the web readers in scope) - source + specs edited, generated/graphql.ts NOT yet regenerated
(`pnpm -C autobyteus-web codegen:local`, builds the server).

OPEN (DS-8, primary behavior, in scope): a delegating run's live view of its LOCAL children:
1. new child row announced live (base: `task_execution_started` / Team `TASK_EXECUTION_STARTED`, row DTO =
   projectDelegatedAgentRun/TeamRun of delegated-children-dtos.ts);
2. a child whose Task closes leaves the live view (`task_executions_closed`), reopen adds it back;
3. child status + live output while viewed: reuse PairedAgentAccess (StandalonePairedAgentAccess / TeamPairedAgentAccess:
   observePairedAgents + pairedAgentStatuses) and publish through the N-402 projection path
   (projectors map remote_agent_presentation -> agent_presentation; add a `child_agent_presentation` case or reuse);
   history poll `agentRunCollaborationStatuses` statuses [] (manager.getAgentStatuses).
Plan: LocalChildObservation per root (beside remoteChildren), driven by DelegationTree changes for that run.
Then: unit run results (pnpm test:unit started 16:37, log /tmp/ae461/unit-full.log), integration rerun,
web codegen + web tests, handoff docs, code review handoff.

## Round 2 (CRR-002 → designer SR-040, SR-041; IR-002)

Done and committed: CR-461-001 (96921d79f0: closure stop re-checks isOpen at the gate close; agent + team;
tests task-run-control.test, lifecycle, standalone root), CR-461-002 first cut (same commit; superseded by
SR-040/041 below), CR-461-003 (c29ad8b104: WorkPacket.assertAllowed at the gate head; acceptWorkPacketIfAllowed),
CR-461-004 (c29ad8b104: team/org token roll-up; DelegatedRunAgentsReader rename), CR-461-005 (f01c75e686: dead exports).

TODO SR-040 + SR-041 (design-spec "The history poll" ~line 168, Removal Plan ~line 411):
1. DelegationTree keeps each run's agents by run ID AND address, read once from its own file (contract §4,
   model.py agents_with_addresses). Poll + view read addresses there (no file per request).
2. Poll: every listed run (active or stopped): isActive; statuses = every agent of openChildrenOf(X) local
   children with tree address and status from the child's own root (TaskRunControl.ownStatus / paired), else
   offline; NO closedTaskExecutionsDigest field.
3. Web refreshListedStatuses: one rule: re-read when isActive or local children (ID+address) differ, at most once
   per distinct answer; else apply statuses; remove stopped-host digest branch; docs/workspace_layout.md; tests
   (design list).
4. Remove: closedTaskExecutionsDigest (+ shared fn in collaboration-stream-contracts root-execution-view-dtos.ts),
   closed_task_executions/closedTaskExecutions (contracts, GraphQL types, runHistoryQueries, web readers),
   task_executions_reopened / TASK_EXECUTIONS_REOPENED, delegated_launch_selections_changed /
   DELEGATED_LAUNCH_SELECTIONS_CHANGED (editor reloads rows after Save), Memory explorer isTaskTeam,
   startedByAgentName, TASK_AGENT, TASK_TEAM_MEMBER. File lists in the design's Removal Plan.
Then: web codegen, web typecheck + specs, server gates, IR-002 in revision record, handoff update, send to code
reviewer (targeted re-review). FU-008 and FU-009 are withdrawn into the ticket.
