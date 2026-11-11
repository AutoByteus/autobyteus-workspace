# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-010`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-007` with `target-collaboration-contract.md` revision 2 (the user, 2026-11-10; details in the requirements' Document Status)
- Behavior-defining supplements and their approval references: `target-collaboration-contract.md` revision 2, approved by the user on 2026-11-10
- User approval of the design, when the direction requires it: `Obtained` — the user, 2026-11-10, in the Solution Designer's conversation, after the design direction and its visible effects were presented: "I think that makes sense what you have proposed"; and on a delegated run's model being changed in its own Settings: "it's independent agent run now … it's setting … that makes sense"
- Design status: `Needs Revision` (SR-014): this design is built on contract revision 2 and the base before autobyteus-469. It is rebuilt on contract revision 5 once the user has decided it. Earlier: `Needs Revision` → revised for architecture review ARCH-REV-001 (`design-review-report.md`, Fail, AR-001 … AR-010); it becomes `Ready` again when the user has decided requirements DEC-011 (which message routes exist by run ID), which the review's AR-002 raised. Every other finding is answered in "Review Corrections (ARCH-REV-001)" and in the sections it names. The earlier spec of SR-003 is superseded (git `3a298ba009`).
- Canonical investigation-notes path: `tickets/in-progress/delegated-copies-outlive-delegator-461/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`, `autobyteus-server-ts/docs/design/collaboration_model.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (all sections), `docs/design-cases.md` (headings), `GLOSSARY.md` (searched), the earlier `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md` — 2026-11-10. `references/design-examples.md`: not used.
- Project design-principle conflicts with the general principles, or discrepancies: none.

## Current-State Read

A standalone agent run's root (`StandaloneAgentRunRoot`) delegates in two ways through one adapter (`standalone-root-task-execution-adapter.ts:110-178`, notes F-1):

- **Hosted** (a target on this node): the delegated agent's handle lives in the root's `RootAgentExecutionRegistry`, a delegated team's `TeamRun` in its `RootTeamExecutionDirectory`. The root starts, idles, wakes, stops and restores them (`RootTaskExecutionLifecycle`), publishes their events on its own stream, and a delegation made by any of them is recorded in the same root. The delegated run's file says so (`taskAgent.coordinatingRun`).
- **Linked** (a target on a peer): `RemoteDelegation` asks the other node for a run, the root records a link, and the work packet is sent. Messages go by run ID through `RemoteRunLinks` and its endpoints (the pair rule); the other node resolves or restores the run's own root and delivers. The run there is an ordinary run with `delegatedFrom` and its own idle shutdown (notes F-2).

The contract makes the linked form the only form. The hosted form is the design issue: it puts another run's lifecycle inside this root (root cause of autobyteus-461).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: several subsystems: the link machinery (renamed and given a second channel), the standalone root (hosted path removed), delegated-run start on this node, the Task side's reach to a run, run history (delegated runs become rows), restart resume, a startup migration over three stored shapes, the collaboration model and glossary, and the web client's tree and stores for delegated runs of a standalone run.
- Architectural risk: `High`
- Risk rationale and supporting evidence: ownership boundary change (a delegated run moves under its own root), persistence change with a migration of existing runs (196 delegated runs, 407 Task records on the user's machine), lifecycle and concurrency (cross-root delivery and wake), wire and stored renames.
- Escalation trigger if implementation or validation discovers new impact: a REQ-009 capability that cannot be served through a link; a stored shape not in the contract; any change needed in team or org roots beyond what "Deliberately left alone" names; a released migration that reads a shape this change alters and is not in the migration plan.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code (`Read`) | `standalone-root-task-execution-adapter.ts:110-178` | One adapter, two paths by placement kind | D-1 | None |
| Code (`Read`) | `agent-collaboration/execution/remote/remote-run-links.ts`, `remote-endpoint.ts`, `remote-run-channel.ts`, `remote-delegation.ts` | Links, endpoints, the pair rule, a channel interface with one implementation | D-1, D-2, D-3 | None |
| Code (`Read`) | `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-team-run-starter.ts`, `remote-message-receiver.ts`; `compositions/collaboration-root-resolver.ts` | How a linked run is created (prepared standalone run / `createTeamRun`, both with `delegatedFrom`), and how an inbound message restores its root | D-2, D-4 | None |
| Code (`Read`) | `standalone-agent-run-root.ts:147-157`; `agent-team-execution/domain/team-run-remote-links.ts`; `services/remote-team-idle-shutdown.ts` | A root with `delegatedFrom` builds a `delegator` endpoint paired with its host or every member, and has an idle shutdown | D-4, D-7 | None |
| Code (`Read`) | `root-task-execution-lifecycle.ts:174-200`; `root-task-dispatch.ts:59`; `task-execution-resource-port.ts`; `compositions/project-task-execution-resource-composition.ts:60-64`; `projects/runtime/task-execution-resource-release.ts:15-29` | Task linking is shared by both paths; the Task side reaches a run through `hostRoot` (stop on closure, status); a remote run is fenced, not stopped | D-5 | The service's internals read in part |
| Code (`Read`) | `run-history/store/agent-run-metadata-store.ts:90-176` (the reader returns a standalone run only without `taskAgent`), `task-agent-team-tree-schema.ts:77-90`, `task-agent-own-records.ts` | Delegated runs are hidden from the ordinary readers by the `taskAgent` section | D-8, D-9 | The history catalog and index files are named in File-Level Completion; their internals are for the implementation to read |
| Code (`Read`) | `agent-execution/services/standalone-agent-run-eligibility.ts:15-16` | `canSwitchRuntime` excludes a run with `delegatedFrom` | D-10 | Why a peer-started run is excluded is not recorded |
| Data (`Measured`) | `evidence/data-model-validation/counts-2026-11-10.txt` | Every stored run converts; counts per shape | D-9 | — |
| Earlier tickets (`Read`) | `delegated-copy-model-change/requirements-doc.md` REQ-005, DEC-005; `delegated-copy-own-run-memory/requirements-doc.md` DEC-015 (U-1) | The Settings edit is kept beside the started launch so the origin text shows only on untouched agents and the composed record round-trips | D-10 (contract V-9) | None |
| Web (`Read`) | `components/workspace/history/AgentRunTaskRows.vue`, `stores/agentRunCollaborationStore.ts` (`taskRows`, `selectTaskRow`, `childTargetFor`), `composables/mobile/useMobileRunTree.ts`, `stores/remoteRunsStore.ts` (named, not read) | A standalone run's delegated rows and their contexts come from its collaboration view | D-11 | The web file list is in File-Level Completion (from a search); files below the store were not read line by line |

## Intended Change

Delegations made from a standalone agent run use links only. A target on this node gets an ordinary run with `delegatedFrom`, under its own root; the delegating root keeps a link and reaches it through the same link owner and endpoints as a run on a peer, over a channel that has a second, in-process implementation for this node. The hosted path leaves the standalone root. Existing data is converted by one startup migration.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-008. Areas: `agent-collaboration/execution/remote` (renamed `links`), `standalone-agent-run-root`, a new local start and delivery for linked runs, `agent-execution` (prepared run with a local back-link, runtime-switch rule), `agent-team-execution` (a team run with a local back-link: admission, pairing; nothing in its hosting), `projects` (Task record role, `hostRoot` meaning, release and status), `run-history` (admission, rows, metadata reader), `restart-resume`, `app-data-migrations` (one migration), `autobyteus-web` (tree rows and opening of a standalone run's delegated runs), the Collaboration Model, Glossary and module docs.
- Derived consumers, when a stored or shared structure changes: the readers of `taskAgent`, `coordinatingRun` and `hostRoot` are listed with their decisions in File-Level Completion (C-1). The Agent-root view (`agent-run-collaboration-dtos.ts`) changes shape (C-5); its readers are the web files of C-4.
- Deliberately left alone: hosting inside team runs and org runs (`TeamTaskExecutionAdapter`, `AgentOrgTaskExecutionAdapter`, their registries), which also serves delegations by the members of a delegated team run (notes F-5); `RootTaskExecutionLifecycle` (still used by all three roots; by the standalone root for linked runs only); the peer protocol's requests except the renamed field; remote feature gaps (`collaboration_model.md` § 4).
- Follow-ups: FU-002 (two oversized files; the standalone root shrinks in this change), FU-003, FU-004, FU-005.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-004 | User | REQ-001 / AC-001, AC-004 | Stop on a run | The root ends its hosted runs first | Each run has its own root; Stop is the ordinary Stop of that root | DS-005 |
| BEH-003 | System | REQ-003 / AC-002, AC-003 | `send_message_to` | In-root delivery; a host is made ready first | Through the link; the receiving root is resolved or restored, then its agent is made ready | DS-002, DS-003 |
| BEH-005 | Contract | REQ-005 / AC-005 | Task closed, reopened, follow-up Task | The hosting root releases the run, fences its input, reopens it | The Task side stops the run itself; the run's own root fences its input; its assigner's root reopens it (RC-1) | DS-004, DS-004b |
| BEH-006 | Operational | REQ-008 / AC-009 | Update restart | Entries are grouped by the hosting root; a host's notice lists its root's delegated entries | A delegated run is recorded under its own root with its delegating run; the notice lists the runs a run delegated to (RC-4) | DS-007 |
| BEH-007 | User | REQ-007 / AC-008 | Archive / Delete | The loaded root's children are ended | Refused while a linked run on this node is working | DS-006 |
| BEH-009 | User | REQ-004 / AC-007 | Open a run's delegated runs | The collaboration stream starts the host | A delegated run is opened as a run; no stream starts an agent | DS-008 |
| BEH-010 | Contract | REQ-011 / AC-011, AC-014 | Upgrade | `taskAgent`, `hostRoot` | The contract's shapes for this step | DS-009 |
| BEH-011 | User | REQ-002, REQ-006, REQ-009 / AC-010, AC-012, AC-013 | The run tree, Settings, Task page | Copy-only features inside the root's view | Ordinary run features | DS-001, DS-008 |
| BEH-008 | System | REQ-001, REQ-011 / AC-011 | Delegation across nodes | Linked | Unchanged path; renamed field | DS-001 … DS-003 (peer channel) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `target-collaboration-contract.md` | The contract | All | This design realizes its first step; the stored shapes are its §2 | Approved |
| `evidence/data-model-validation/` | Counts per stored shape | REQ-011 | The migration's shape inventory starts from it | Evidence |
| `follow-ups.md` | The next steps | REQ-010 | Names what stays hosted | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` with a `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - **Several kinds or forms / two paths for one capability** (Principle 1): hosted and linked delegation in one adapter, with different gates (a saved Task, files and a follow-up Task are refused on the linked path; stop on Task closure exists only on the hosted path).
  - **Boundary or ownership** (Principle 3): one root owns another run's lifecycle.
  - **Vocabulary drift** (Principle 15): "remote" names the link machinery although a link is not about location; "coordinating run" means host.
  - **Persisted-data transition** (Principle 5): `taskAgent` → `delegatedFrom`.
  - **Behavior by absence** (Principle 13): a delegated run is "not a run the user started" because a reader hides files with a `taskAgent` section (guards G1, G2).
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: Current-State Read.
- Design response: one delegation form (links); each delegated run under its own root; the hosted path removed from the standalone root; the link machinery named for what it is.
- Refactor rationale: the user's direction (DEC-010); the contract.
- Intentional deferrals and residual risk: team and org roots keep hosting until FU-003 and FU-004, so two delegation forms exist in the code until then, each used by a different kind of delegating run, never both by one.

## Terminology

Contract §1 words. In code: **link** (the delegating run's record of a delegated run), **back-link** (`delegatedFrom`), **linked run** (a delegated run reached through a link), **link channel** (how a root reaches a linked run: in-process on this node, the peer client across nodes). "Remote" and "peer" stay only for what is about another node. Added to `GLOSSARY.md` in this change.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the hosted path of the standalone root (see the removal plan); the copy-only Stop and model edit for a standalone run's delegated runs; the `taskAgent` writer for runs delegated from a standalone run.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None` for delegations made from a standalone run. Hosting in team and org roots is not a compatibility path of this change; it is the not-yet-converted part named by TC-4 (the user).

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: contract §2 and §5; the user's data: 196 delegated runs, 197 links, 407 Task record entries in 361 files.
- Relevant code-model, serialization, semantic, or physical-store change: a rename that removes a wrong meaning (`taskAgent`/`coordinatingRun` → `delegatedFrom`/`delegatingRun`), removed duplicates (`address`), a role value rename (`delegated` → `subWork`), links of nested runs moved to the run that holds them, history rows added for runs that become ordinary runs.
- Normal reader/writer behavior and representative evidence: trees and run files are read tolerantly and written exactly (module docs); the ordinary readers hide files with `taskAgent` today.
- Required semantics and invariants under direct use: a file with `taskAgent` cannot be read as an ordinary run, so direct use is impossible.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: no folder moves (each run already has its folder); files rewritten atomically.
- Decision: `Migration Required`
- Decision rationale: `DESIGN.md` rule 10 and the guideline §3: a stored name with a wrong meaning is renamed by a migration; current code reads only the new shape.
- Acceptance criteria or design constraints supported by this decision: AC-014, QR-003.

### Migration Plan

- Current canonical schema / version: contract §2 (no version fields).
- Older persisted schema version(s) that require transformation (counts: `counts-2026-11-10.txt`, `nested-counts-2026-11-10.txt`): runs held by a standalone run and delegated by it: E1/E2 with a standalone holder, E5, E6, E11; nested runs, split by their holder after conversion (RC-5): E3a (28: the delegator is a member of a delegated team run of a standalone run), E3b (1: the delegator is a delegated agent run of a standalone run), E3c (3: the top run is a team run; untouched in this step); every Task record: E13 and the `hostRoot` value of D-5; a pending `restart-resume/busy-runs.json` (RC-4); E12 (`coordinatingRun` → `delegatingRun` on a peer-started run; 0 in the user's data). E4 (4 records without a delegator) are all held by team or org runs and are untouched in this step.
- Why direct use and discard/rebuild are insufficient: above.
- Migration trigger: `Startup`
- Migration owner and file / subsystem location: `autobyteus-server-ts/src/app-data-migrations/migrations/<date>_delegated_runs_of_agent_runs_as_runs/`, registered last; frozen copies of today's shapes in `frozen/` (guideline §4, sealed area).
- Normal business/runtime path that remains current-schema-only: every reader of a run file, tree and Task record.
- Historical-shape types or decoders confined to migration-owned code: today's `taskAgent` section, the task-agent run metadata and team tree, the Task record with role `delegated`.
- Completion marker / version ledger: the runner's record; per item, the shape itself (a file already in the target shape is skipped).
- Restart-safety or idempotency strategy: per delegating run, in this order, each step recognizable from the files: (1) write each delegated run's own file in the target shape (atomic replace); (2) for a delegated agent run, write its `collaboration_tree.json` with `host.address` when it has none; (3) move nested links into their team run's tree; (4) add the history rows; (5) rewrite the Task records. The delegating run's own tree needs no change for non-nested links (the link shape is unchanged).
- Validation before current runtime proceeds: frozen validators of the target shape per written file; no global gate. A delegating run whose tree the frozen parser cannot read is left untouched and reported (`PRESERVED_UNSUPPORTED_TREE`, warning); its delegated runs keep the old shape and are not available until fixed; every other run is converted (guideline §1, §6).
- Backup / rollback / quarantine / operator-recovery strategy: no backup copies (guideline §7: atomic replace per file, sources recognized on retry); no downgrade (release notes say so).
- Concurrent old/new application access risk and cutover / maintenance / deployment-sequencing decision: runs before any run is active.
- Historical migration retention decision: no released migration needs repointing: migration code imports only the sealed area's frozen copies (guideline §4; `tests/architecture/app-data-migration-boundaries.test.ts` enforces it; a search for imports of current modules from `app-data-migrations/` finds only paths inside `frozen/server/`). The new migration adds frozen copies of today's shapes it reads (`frozen/task-agent-own-run-v1` and `frozen/released-run-package-shapes` already hold the task-agent own file and tree shapes; the implementation confirms they equal today's and adds the Task record with role `delegated`).

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| Own file | `taskAgent` section (agent run file, team tree) | `delegatedFrom`; launch facts at the run's own place (D-10) | The migration | Frozen target validator | Item left as it was; counted; retried next start |
| Agent address | `taskAgent.address` | `collaboration/collaboration_tree.json` `host.address` | The migration | Reread | As above |
| Nested link, E3a | Link in the standalone run's tree; `taskAgent.coordinatingRun` = the standalone run | A hosted record in the team run's `rootTeam.taskExecutions` (the team tree's existing shape for a run it hosts); `taskAgent.coordinatingRun` = that team run; Task record `hostRoot` = that team run | The migration | Reread both trees | The record is written to the team tree before the link is removed from the standalone tree; seen in both on retry → the source link is removed |
| Nested link, E3b | The same source | An ordinary run with `delegatedFrom { delegatingRun: {agent, the delegated agent run}, delegatorAgentRunId: that run }`; the link in that agent run's `collaboration/collaboration_tree.json` (created with its `host.address`) | The migration | Reread | As E3a |
| Busy-run record | `{ root: the old hosting run, agentRunId, place: "delegated" }` | RC-4's entry for the converted run | The migration | Frozen target validator | A missing file is the normal case; an unreadable one is left (the resumer already discards it) |
| History rows | none | A row per run that became ordinary | The migration, through a port to the history index writer | Reread | Missing row added on retry |
| Task record | role `delegated`; `hostRoot` = the old coordinating run | role `subWork`; `hostRoot` = the root that runs it | The migration | Frozen target validator | Per file |

### Data Migration Guideline checklist (guideline §2)

1. **Need:** yes. `taskAgent`/`coordinatingRun` carry a wrong meaning (the run is hosted by the top of the chain); a tolerant reader would be a permanent mapping from an old stored name (`DESIGN.md` rule 10). The role value `delegated` is a second meaning of a domain word.
2. **Availability:** the app opens and new work is possible when no run converts: the migration gates nothing; an unconverted delegated run is only not available (its delegating run lists nothing it cannot open).
3. **Source and target (shape inventory):** contract §5 with counts from the user's data, read-only (`evidence/data-model-validation/counts-2026-11-10.txt`): E1/E2 (159 with their holder kinds), E3 (32), E4 (4), E5 (1), E6 (1), E7 (2; not converted in this step: org runs), E8 (2; unchanged), E9/E10/E13 (407 Task record entries: 377 `assigned`, 28 `delegated`, 2 `broughtIn`), E11 (9), E12 (0). Predecessor residue: delegated runs that an earlier migration left unconverted keep a nested or source-less shape and are not in the frozen target-shape parser's input; they are preserved exclusions. Each shape maps to a fixture: F-E1 … F-E13 (one small hand-built data folder per shape, same keys as the stored shapes), plus F-RERUN (stopped between two steps) and F-UNREADABLE (one delegating run with an unreadable tree beside a readable one).
4. **Disposition:** converted; already current (skipped); preserved exclusion (unreadable tree or own file: left, reported, warning); failed item (retried next start). Aggregate: `SUCCEEDED`, or `SUCCEEDED_WITH_WARNINGS` with preserved exclusions, or `FAILED` when a write failed. Admission is per run, from the files, never from the aggregate.
5. **Commit and retry:** atomic replace per file; the order of the migration plan makes every intermediate state recognizable; no backup, hash or journal.
6. **Current-only boundary:** old shapes are read only by frozen copies inside `app-data-migrations/`; current code reads `delegatedFrom` for runs delegated from a standalone run and never maps `taskAgent` to it. Registered last; no prerequisite ids beyond the released ones that produce today's shapes (`20261017_task_agent_own_run_v1`, `20261019_delegated_copy_own_file_complete_v1`).
7. **Cost:** one small file read and rewrite per delegated run (196 on the user's machine), per Task record file (361), per standalone tree that holds a nested link, and the two history indexes once. No trace, log or memory file is read.
8. **References:** link → delegated run (both ends rewritten in the order above); Task record → run (by its own ID; unchanged); history row → run.
9. **Evidence:** migration tests per fixture, a second start as a no-op, the mixed readable/unreadable case, and an isolated instance started on the fixtures (AC-014). Not verified: data of releases older than the supported upgrade range.
10. **Lessons and review:** `team-agent-memory-layout-app-data-migration.ts` and the task-agent own-run migration (rename in place, per-run input gate, no lockout); the v1.4.87 lockout (no unconditional read of every tree, no global gate); independent review by the architecture reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-011 | `delegate_task` in a standalone run | A new ordinary run with its work | The delegating root's task lifecycle (existing) | The one delegation form |
| DS-002 | Primary End-to-End | BEH-003 | `send_message_to` (delegator → delegated run) | The delegated run's agent has the message | The delegating root (send), the delegated run's root (receive) | Wake by message |
| DS-003 | Primary End-to-End | BEH-003 | `send_message_to` (delegated run → delegator, by run ID or address) | The delegator has the message | The delegated run's root (send), the delegating root (receive) | The report |
| DS-004 | Primary End-to-End | BEH-005 | A Task closes | Its runs are stopped and take no input | The Task service | The Task owns the work |
| DS-004b | Primary End-to-End | BEH-005 | The assigner messages a run of a reopened Task | The run continues | The assigner's root (its task lifecycle, existing) | Reactivation |
| DS-005 | Primary End-to-End | BEH-001 | Stop | That run stopped | Each run's own manager (existing) | By construction |
| DS-006 | Primary End-to-End | BEH-007 | Archive / Delete | Refusal or the history change | The history gate | TC-2 |
| DS-007 | Primary End-to-End | BEH-006 | Startup after an update | Busy runs resumed, bottom-up along the delegation | `RestartResumer` | RC-4 |
| DS-008 | Primary End-to-End | BEH-009, BEH-011 | The run tree | A delegated run opened as a run | The web run tree | The relationship shown |
| DS-009 | Primary End-to-End | BEH-010 | Startup | Data in the target shape | The migration | Existing runs |

## Primary Execution Spine(s)

- DS-001: `delegate_task -> StandaloneAgentRunRoot.delegateToNewCopy -> RootTaskExecutionLifecycle (work, Task link, dispatch) -> StandaloneRootTaskExecutionAdapter.planActivation -> LinkedRunDelegation -> LinkChannel(this node).startDelegatedRun -> LocalDelegatedRunStarter -> AgentRunService.prepareAgentRun | TeamRunService.createTeamRun (with delegatedFrom) -> adapter commits the link -> LinkChannel.deliverMessage(work packet) -> the new run's root.acceptLinkedWorkPacket -> its agent starts`
- DS-002: `send_message_to(run ID) -> delegating root deliverExact -> RunLinks.endpointFor -> LinkedMessageSend (engine prepares, log line) -> LinkChannel(this node).deliverMessage -> LinkedMessageReceiver -> stored link check -> CollaborationRootResolver.resolveOrRestore -> target root.acceptLinkedMessage -> its agent made ready -> input`
- DS-003: the same in the other direction through the `delegator` endpoint built from `delegatedFrom`; by address: `the delegated run's recipient resolver -> not in its own run -> the delegating run's standing instance at that address (asked through the link channel) -> the same send`.
- DS-004: `update_task DONE -> ProjectTaskService (record closed) -> TaskExecutionResourceRelease -> the release request of the Task composition -> for a run that is its own root: the ordinary Stop of that run through its run service (AgentRunService.terminateAgentRun | TeamRunService.terminateTeamRun) -> ActiveCollaborationRootDirectory.taskExecutionsClosed([run]) -> each loaded root that links it publishes task_executions_closed`. Afterwards any input to the run is refused by its own root's input fence (its own Task chain, RC-1).
- DS-004b: `send_message_to(run ID) by the assigner -> the assigner's root deliverExact -> RootTaskExecutionLifecycle.deliverToExactTarget -> reactivateClosedTarget (ownerOf through the link endpoint's chain; the adapter's taskExecutionWithIngress answers for a link; port.assertReopenable; port.reopenAssignment; publish task_executions_reopened) -> the linked send of DS-002 -> the run's root is restored and its fence now passes`
- DS-008: `open a run -> its Agent-root view (links without the closed ones, each with its summary) -> rows under the run -> select a row -> the ordinary run opening path of that run -> /ws/agent/:runId or the team stream`. The top-level lists come from the history rows and leave out a linked run whose delegating run is stored (D-8).
- DS-007: `startup -> the migration rewrites a pending busy-run record (RC-4) -> RestartResumer.resumeAfterUpdate -> order the entries bottom-up by the recorded delegatingRun -> resumeOne (own root resolved or restored; notice lists the accepted runs this run delegated to) -> the run resumes`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing lifecycle prepares the work and its Task, then asks the adapter for an activation. The adapter has one path: a linked delegation. For this node the channel starts the run locally with the launch the delegating side resolved (the Project's folder, inheritance, tool approval), and the run is an ordinary prepared standalone run or a created team run. The link is committed in one tree write; the work packet starts the agent or the team's coordinator. | Delegation, link, run | The delegating root's lifecycle | Launch resolution (existing `CollaboratorAdmission`), Task link (existing) |
| DS-002, DS-003 | A message between a run and a run it is linked with leaves through the sender's root (engine: scope check, log line) and enters through the receiver's root (link check against stored links, restore when inactive, the agent made ready). On one node the channel calls the receiver directly. Reference files pass unchanged on this node. | Message, link, root | Sender's root, then receiver's root | Message logs (both), Task scope |
| DS-004, DS-004b | The Task record names the root that runs each of its runs. An independent run is stopped by the ordinary Stop of that run, asked for by the Task side; it stays restorable. Its own root refuses input while its record is closed, because the run's own agents have a Task chain there (the run's own reference). The run that delegated it hides its row: its closed set is its hosted closed runs plus its links whose record is closed. Reactivation is unchanged in the assigner's root: it reopens the record and sends; nothing has to be settled for a run that was stopped in the ordinary way. | Task, run, link | Task service; the assigner's root | — |
| DS-008 | The rows under a run come from that run's view of its links, as today, so the order and the hiding of closed-Task runs keep one source. Opening a row opens the run it names. A delegated run also has a history row, used for archive, delete and for listing it as a run of its own when its delegating run is not stored. | Links, run rows | Web run tree | Status poll of listed runs (existing) |
| DS-007 | RC-4. | Busy-run entries | Resumer | The notice |
| DS-009 | See the migration plan. | Stored shapes | The migration | Frozen shapes |

## Spine Actors / Main-Line Nodes

`StandaloneAgentRunRoot`, `RootTaskExecutionLifecycle`, `StandaloneRootTaskExecutionAdapter`, `LinkedRunDelegation` (today `RemoteDelegation`), `RunLinks` (today `RemoteRunLinks`), `LinkChannel` (today `RemoteRunChannel`) with `LocalLinkChannel` and the peer client, `LocalDelegatedRunStarter`, `LinkedMessageReceiver` (today `RemoteMessageReceiver`), `CollaborationRootResolver`, `ProjectTaskService`, the history catalog services, the web run tree.

## Ownership Map

- A root: its own agents, its links, its back-link, its message log, its life.
- `RunLinks`: which runs a root is linked with and what each may send and receive.
- `LinkChannel`: reaching a linked run's node. `LocalLinkChannel` owns "this node": start, deliver, command, and reading the delegating run's standing instances for an address.
- `LocalDelegatedRunStarter`: turning a resolved source into an ordinary run with a back-link.
- The Task service: which runs work on a Task and when their work ends.
- The history catalogs: which runs exist and how they are listed.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `LinkChannel` (routing by node) | `LocalLinkChannel`, the peer client | One interface for a root | Link rules (they are in `RunLinks` and the endpoints) |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| The hosted branch of `StandaloneRootTaskExecutionAdapter` (`planActivation`/`beginActivation` for `agent` and team placements, `restoreChain`, `shutDown`, `isLive`, `taskExecutionStatus`, registrations for hosted runs) | No run is hosted by a standalone root | The linked path | The adapter keeps planning, link commit and the Task-facing queries for linked runs |
| `RootAgentExecutionRegistry` and `RootTeamExecutionDirectory` in the standalone root (construction in `standalone-root-builder.ts`, uses in the root and its delivery) | Nothing to host | — | Both stay for org roots |
| `StandaloneAgentRunRoot.stopDelegatedExecution`, `updateDelegatedLaunchSelections`, `standalone-root-delegated-launches.ts`, the `AGENT` branch of `DelegatedLaunchSelectionService`, `StandaloneAgentRunRootManager.updateStoppedDelegatedLaunchSelections` and its helpers | A delegated run is stopped and configured as a run | The ordinary run Stop and stopped-run settings | The manager file drops under 500 lines |
| The standalone root's child presentation (`CollaborationAgentPresentationEventAdapter` use, `agent_presentation` events for children, `collectStandaloneRootAgentStatusSnapshots`, `collectStandaloneRootInputSnapshots`, the member view projection service for children, the child context-file owners and routes) | Children are not parts of the run | Each run's own stream and views | Server files: C-5; web files: C-4 |
| `root.stop()`'s child termination; `endRoot`'s child stop; restart resume's `terminated` skip for a delegated entry | No children | The ordinary Stop; DS-006; DS-007 | — |
| The `taskAgent` writer and reader for runs delegated from a standalone run (`task-agent-own-records.ts` paths used by the standalone package store: compose on load, split on save) | The link is the whole record | `standalone-root-package-store.ts` reads and writes links only | The reader stays for team and org trees |
| `delegatedFrom.coordinatingRun` (stored and on the wire between nodes) | Renamed | `delegatingRun` | Clean cut (`DESIGN.md` rule 9) |
| The word "remote" in the link machinery (`RemoteRunLinks`, `RemoteEndpoint`, `RemoteDelegation`, `RemoteMessageSend`, `RemoteInbound*`, folder `execution/remote/`) | A link is not about location | `RunLinks`, `LinkedRunEndpoint`, `LinkedRunDelegation`, `LinkedMessageSend`, `LinkedInbound*`, folder `execution/links/` | Peer-only pieces keep "remote"/"peer": `RemoteRunObservation`, `remote-collaboration/*` |

## Return Or Event Spine(s)

A delegated run's events go to its own stream (the ordinary agent or team stream). The delegating root's stream carries its links, its messages and its lifecycle.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Idle shutdown of a delegated run | DS-001 | The delegated run's root | Existing `StandaloneHostIdleShutdown`, `RemoteTeamIdleShutdown` (renamed for what they are: the idle shutdown of a run with a back-link) | CM-7 | — |
| A linked team run's member list on the delegating side | DS-002 | `RunLinks` | Read from the team run's own tree on this node when first needed, kept in memory (the members never change) | The contract keeps members out of a local link | A stored copy would be a redundant attribute |
| Launch notes, routing decisions | DS-001 | `LinkedRunDelegation` | As today for both channels | REQ-009 | — |

## Ownership Boundaries

- A root never holds another run's handle, status or events.
- Only `RunLinks` and its endpoints decide whether two runs may message each other; the Task-scope rule stays in the engine (`assertDeliveryAllowed`).
- Only the channel knows whether a linked run is on this node.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunLinks` | Endpoints, the channel | Roots, their message delivery and task adapters | A root calling another root's methods directly to deliver or stop | Add the operation to the channel |
| `LocalLinkChannel` | `CollaborationRootResolver`, `LocalDelegatedRunStarter`, `LinkedMessageReceiver` | `RunLinks`, `LinkedRunDelegation` | A root importing `AgentRunService` or `TeamRunService` to start a delegated run | — |
| The run managers (`StandaloneAgentRunRootManager`, `AgentTeamRunManager`) | Roots | The channel, the Task composition, history | — | — |

## Dependency Rules

- `agent-collaboration/execution/links` depends on no root module and no run service (as `execution/remote` today).
- `LocalLinkChannel` is composed at process composition (beside the remote collaboration composition) from the root resolver and the run services; roots get it through the existing `resolveRemoteRunChannel` seam, renamed.
- `standalone-agent-run-root` no longer depends on `agent-collaboration/execution/backends` registries.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LinkChannel.startDelegatedRun({ node, address, delegatorAgentRunId, delegatingRun, work, source? })` | A linked run | Create the run on that node. `source` (the resolved definition and launch) is given for this node; a peer resolves its own | `node`: this node or a peer's ID | `delegatingRun` replaces `coordinatingRun` |
| `LinkChannel.deliverMessage`, `ownerCommand`, `runSummaries` | A linked run | As today; on this node, in-process | target root `{kind, runId}` + agent run ID | `agentProjection` and `observeRun` stay peer-only: a run on this node is read as a run |
| `LinkChannel.standingInstanceAt(delegatingRun, address)` | A delegating run on this node | The agent run at that address in the delegating run, for CM-5 and the delegator in `list_available_agents` | `{kind, runId}` + address | This node only; a peer answers "not found", as today |
| Root: `acceptLinkedMessage`, `acceptLinkedWorkPacket` | A root | Today's `acceptRemote*`, renamed | — | Reference files carried |
| Root: `ownRunStatus(): AgentExecutionStatus` (on `ActiveRootMessageBoundary`, implemented by a standalone root and a team root) | A root | The run's own status for the Task page: the host's status, or the team's folded member status; `offline` when not running | — | Used by the Task composition when a record's `hostRoot` is the run itself. The release of such a run is not a root operation: it is the ordinary Stop through the run service (RC-1) |
| GraphQL / WS | — | See File-Level Completion C-5 | — | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LinkChannel` | Yes | Yes (node + root + agent run ID) | Low | — |
| `ownRunStatus` | Yes | Yes | Low | Removed with `hostRoot` in FU-005 (the Task side then asks the run service) |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| The link machinery | `Remote*` → `RunLinks`, `LinkedRun*`, `LinkChannel` | Yes | Yes after the rename | High if left | Rename in this change |
| The back-link's run | `coordinatingRun` → `delegatingRun` | Yes | Yes | — | Stored, wire and code together |
| Idle shutdown of a run with a back-link | `RemoteTeamIdleShutdown` → `DelegatedTeamRunIdleShutdown` | Yes | Yes | Medium | Rename |
| Sub-work role | `delegated` → `subWork` | Yes | Yes | — | Stored and code together |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Links, endpoints, pair rule, stored-link check | `execution/remote` | Reuse (renamed) | Complete | — |
| Create a run with a back-link | `prepareAgentRun`, `createTeamRun` with `delegatedFrom` | Reuse | Used for peers today | — |
| Restore on message | `CollaborationRootResolver` | Reuse | — | — |
| Idle shutdown | Existing two classes | Reuse | — | — |
| Launch resolution on this node | `CollaboratorAdmission.catalogTaskSourceOf`, `projectTaskExecutionSource` | Reuse | Today's local path | — |
| In-process channel | — | Create New | No implementation for this node exists | The peer client is HTTP to another node |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/links` | Links, endpoints, delegation over a channel, the channel interface | DS-001 … DS-003 | Roots | Extend (rename) | — |
| `local-run-links` (new, beside `remote-collaboration`) | The channel for this node: starter, receiver wiring | DS-001 … DS-003 | `LinkChannel` | Create New | Composed at process composition |
| `standalone-agent-run-root` | A standalone run's root without hosting | DS-001, DS-005 | — | Extend (reduce) | — |
| `projects` | Role name; `hostRoot` meaning | DS-004 | Task service | Extend | — |
| `run-history` | Admission and rows of delegated runs | DS-008 | Catalogs | Extend | C-3 |
| `app-data-migrations` | DS-009 | DS-009 | Runner | Extend | — |
| `autobyteus-web` | The tree and opening of delegated runs | DS-008 | Run tree | Extend | C-4 |

## Draft File Responsibility Mapping

Folded into the final mapping.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| The link record | `run-execution-tree-shared-records.ts` (existing `TaskExecution` link and `RemoteTaskExecution`) | `run-history` | Three trees | Yes (contract §3) | The standalone tree's two in-memory lists become one list of links | A composed record with the linked run's content |
| `DelegatedFrom` | `agent-run-metadata-types.ts` (existing) | `run-history` | Agent run file and team tree | `nodeId` optional | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegatedFrom` | Yes | Yes | Low | — |
| Link | Yes | Yes | Low | — |
| Task record | Yes; `hostRoot` = the root that runs it | Removed in FU-005 | Medium until then | D-5 |

## Final File Responsibility Mapping

Server and web files; the rows that were open at SR-008 point to File-Level Completion.

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/links/run-links.ts`, `linked-run-endpoint.ts`, `link-channel.ts`, `linked-run-delegation.ts`, `linked-message-send.ts`, `linked-task-activation.ts`, `link-refusal-codes.ts` (moved and renamed from `execution/remote/`) | links | `RunLinks` | As today, without the word "remote"; local links admitted; a saved Task, reference files and a follow-up Task allowed for a link on this node | Existing files | Link |
| `local-run-links/local-link-channel.ts` (new) | local-run-links | `LinkChannel` for this node | In-process start, deliver, command, summaries, standing instance | One implementation | — |
| `local-run-links/local-delegated-run-starter.ts` (new) | local-run-links | Starter | Resolved source → prepared agent run or created team run with `delegatedFrom`, launch facts recorded on the run | One concern | `DelegatedFrom` |
| `agent-collaboration/execution/links/linked-inbound-delivery.ts` (the core of today's `remote-collaboration/inbound/remote-message-receiver.ts`: stored link check, resolve or restore, hand over; with its root-directory port), and `remote-collaboration/inbound/remote-message-receiver.ts` reduced to the peer gateway's adapter (peer identity, title record, routing decisions) | links; remote-collaboration | Inbound | One inbound rule for both channels (C-2) | The rule is channel-neutral; the adapter is about a peer | — |
| `compositions/link-channel-composition.ts` (new) | compositions | Channel routing by node | Binds the two implementations | Composition | — |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `services/standalone-root-task-execution-adapter.ts`, `standalone-root-message-delivery.ts`, `standalone-root-builder.ts`, `standalone-agent-run-root-manager.ts`, `persistence/standalone-root-package-store.ts`, `standalone-root-execution-index.ts`, `standalone-root-recipient-resolver.ts`, `standalone-root-collaborators.ts` | standalone root | Root | The reductions of the removal plan; `acceptLinked*`; own-run release | Existing | Link |
| `agent-execution/services/standalone-agent-run-eligibility.ts` | agent-execution | Runtime-switch rule | D-10 | Existing | — |
| `agent-team-execution/domain/team-run-remote-links.ts` (renamed), `services/remote-team-idle-shutdown.ts` (renamed), team tree schema and admission | team execution | Team root with a back-link | A back-link without `nodeId`; `releaseTaskExecutions` for its own run | Existing | `DelegatedFrom` |
| `projects/domain/task-execution-resources.ts`, `stores/task-execution-resource-schema.ts`, `services/task-execution-resource-service.ts`, `compositions/project-task-execution-resource-composition.ts`, `task-execution-resource-port.ts` (role type) | projects | Task record | `subWork`; `hostRoot` meaning | Existing | — |
| `run-history` files of C-3 | run-history | Rows | `delegatedFrom` on a row; delegated runs admitted; top-level lists | Existing files | — |
| `restart-resume/busy-run-record.ts`, `busy-run-recorder.ts`, `restart-resumer.ts`, `restart-notice.ts`; `agent-collaboration/execution/services/active-collaboration-root-directory.ts` (`placeOf` also answers the root's delegating run; `taskExecutionsClosed`) | restart-resume; root directory | Resumer | RC-4, RC-1 | Existing files | — |
| `standalone-agent-run-root/services/standalone-root-location-service.ts` and its consumers (`token-usage` roll-up, `api/rest/context-files.ts`, `run-history/services/run-last-activity-reader.ts`, `agent-execution/runtime/general-process-run-supervisor.ts`, `agent-collaboration/execution/services/collaboration-execution-location-service.ts`) | standalone root | Location | RC-3 | Existing files | — |
| `services/agent-streaming/agent-collaboration-stream-handler.ts` | streaming | Agent-root stream | RC-8 | Existing file | — |
| `app-data-migrations/migrations/<date>_delegated_runs_of_agent_runs_as_runs/*`, `frozen/*` additions | migrations | The migration | Migration plan | Sealed area | Frozen copies |
| `autobyteus-web` files of C-4 | web | Run tree | Rows from the delegating run's view of its links; opening as a run; removal of child contexts of a standalone run | Existing files | — |
| `docs/design/collaboration_model.md`, `GLOSSARY.md`, `docs/modules/standalone_agent_run_root.md`, `agent_communication.md`, `remote_collaboration.md`, `projects.md`, `run_history.md`, `restart_resume.md`, `agent_memory.md` | docs | — | The contract and the mechanics | — | — |

## File-Level Completion

From searches at `aae0a53a81` (`grep -rlE` in `autobyteus-server-ts/src` outside `app-data-migrations`, and in `autobyteus-web` outside tests and generated code).

**C-1 Readers of the changing fields, with the decision for each.**

| Field | Files | Decision |
| --- | --- | --- |
| `delegatedFrom.coordinatingRun` (the back-link and its wire form) | `run-history/store/delegated-from-schema.ts`, `agent-collaboration/execution/remote/remote-endpoint.ts`, `remote-delegation.ts`, `remote-run-channel.ts`, `remote-collaboration/channel/peer-gateway.ts`, `peer-client.ts`, `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-collaboration/domain/remote-requests.ts` | Renamed `delegatingRun`; `nodeId` optional in the stored back-link (absent: this node) |
| `taskAgent` and its `coordinatingRun` (the hosted shape) | `run-history/store/task-agent-team-tree-schema.ts`, `task-agent-own-records.ts`, `task-agent-own-file-schema.ts`, `task-execution-tree-split.ts`, `task-agent-link-check.ts`, `remote-task-execution-links.ts`, `coordinating-tree-shapes.ts`, `team-run-execution-tree-store.ts`, `agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, `agent-team-execution/domain/task-agent-team-tree.ts` | Kept for runs hosted by team and org runs (FU-003 … FU-005 remove them). `standalone-root-package-store.ts` stops composing and splitting: a standalone tree holds links only |
| either shape, for listing memory | `memory-search/runs/memory-run-discovery.ts`, `agent-memory/services/agent-memory-explorer-service.ts`, `task-team-root-memory-source.ts`, `team-memory-explorer-service.ts` | A run with `delegatedFrom` is an ordinary run for these (listed under its definition, or as a team run); the hosted shape is read as today |
| `hostRoot` | `agent-collaboration/execution/task/root-task-dispatch.ts`, `root-task-execution-lifecycle.ts`, `task-execution-resource-port.ts`, `compositions/project-task-execution-resource-composition.ts`, `projects/domain/task-execution-resources.ts`, `models.ts`, `stores/task-execution-resource-schema.ts`, `services/task-execution-resource-service.ts`, `project-task-service.ts`, `task-root-view-builder.ts`, `runtime/task-execution-resource-release.ts`, `changes/project-change-messages.ts`, `api/graphql/types/project-tasks.ts` | Kept with the meaning of D-5. The value for a linked run on this node comes from the plan's target (`LinkedRunDelegation.planActivation` sets `target.root` to the started run's own root for this node, the delegating root for a peer, as today). `adHocTaskIdsHostedBy` (the Tasks with no Project deleted with a run) reads the Tasks whose `assigned` entry was made by an agent of that run (`assignedBy`), because a run no longer "hosts" what it delegated |
| role `delegated` | `task-execution-resource-port.ts` (`TaskExecutionRole`), `projects/domain/task-execution-resources.ts`, `stores/task-execution-resource-schema.ts`, and their readers found by the type | `subWork` |

**C-2 Inbound delivery.** One rule in `links/linked-inbound-delivery.ts`; two callers: the peer gateway's adapter (`remote-collaboration/inbound/remote-message-receiver.ts`) and `LocalLinkChannel`.

**C-3 History.** `run-history/store/agent-run-history-index-record-types.ts`, `agent-run-history-index-store.ts`, `team-run-history-index-record-types.ts`, `team-run-history-index-store.ts`; `run-history/services/agent-run-history-catalog-service.ts`, `agent-run-history-row-projector.ts`, `team-run-history-catalog-service.ts`, `team-run-history-index-row-projector.ts`, `collaboration-root-history-service.ts`, `workspace-run-history-service.ts`, `project-run-history-service.ts`, `standalone-run-liveness.ts`; `run-history/domain/agent-run-history-index-types.ts`, `team-run-history-index-types.ts`; `api/graphql/types/run-history.ts`. A row records its run's delegating run when the run is created (the index is derived data; the run's own file stays the owner). The catalogs' top-level lists apply D-8. `standalone-run-liveness.ts` gets the refusal of DS-006: a linked run on this node is working (asked through the channel's `runSummaries`).

**C-4 Web.** Components: `components/workspace/history/AgentRunTaskRows.vue`, `RunDefinitionGroups.vue`, `components/runList/RunListRow.vue`, `RunListPanel.vue`, `components/workspace/agent/AgentWorkspaceView.vue`, `components/mobile/MobilePairedShell.vue`, `components/workspace/config/ExistingRunConfigEditor.vue` (the delegated section for an agent run goes). Stores: `stores/agentRunCollaborationStore.ts`, `activeContextStore.ts`, `agentRunStore.ts`, `existingRunConfigStore.ts`. Composables: `useWorkspaceHistorySelectionActions.ts`, `projects/useTaskRootNavigation.ts` (the Task page's locator opens the run itself), `mobile/useMobileRunOpening.ts`, `mobile/useMobileRunTree.ts`, `agentCollaboration/useAgentRunCollaborationSync.ts`, `runHistory/useRunHistorySectionLoad.ts`. Utilities and services: `utils/mobile/mobileRunTreeProjection.ts`, `services/agentCollaboration/agentRunCollaborationContext.ts`, `agentRunCollaborationHydration.ts`, `agentRunCollaborationStreamingService.ts` (reduced to links, messages, lifecycle), `agentRunCollaborationChildContextFactory.ts` and `agentRunCollaborationChildHydration.ts` (removed), `services/runConfigEditing/delegatedCopyLiveness.ts` (the agent-root branch goes), `services/runHydration/runFileChangeHydrationService.ts` and `services/eventMonitor/eventMonitorActiveTracePageService.ts` (the standalone-member reads go), `graphql/queries/runHistoryQueries.ts`, `collaboratorQueries.ts`. The archive and delete actions show the server's refusal (`stores/runHistoryMutationActions.ts`, `composables/useWorkspaceHistoryMutations.ts`: today they drop the server's message).

**C-5 Shapes on the wire.**
- The Agent-root view (`autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts`): its composed child records are replaced by one list of linked runs in the shape the view already uses for runs on a peer (address, run ID, delegator, start time; a team's coordinator and members; title and statuses as a summary), with the node only for a peer. `closed_task_executions` stays. For a linked team run on this node the members and the summary are read from that run when the view is built, for listed links only (QR-004).
- `/ws/agent-collaboration/:hostRunId`: no agent presentation events and no commands for a run on this node (it has its own stream); commands for a run on a peer stay.
- GraphQL: `agentRunCollaborationMemberProjection`, `agentRunCollaborationMemberEventMonitorActiveTracePage`, `agentRunCollaborationMemberFileChanges` and the member context-file and file-content routes of a standalone run are removed (a run's own queries serve); `stopDelegatedExecution`, `updateDelegatedLaunchSelections` and `delegatedLaunchModelOptions` lose the `AGENT` root kind; the history row types get `delegatedFrom`; the peer requests carry `delegatingRun`.
- Clean cut on every one (`DESIGN.md` rule 9).

## Applied Patterns

- Adapter: `LocalLinkChannel` and the peer client behind `LinkChannel`.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/execution/links/` | Folder (renamed from `remote/`) | `RunLinks` | The link machinery | Shared by all roots | Anything about HTTP or a peer's registration |
| `autobyteus-server-ts/src/local-run-links/` | Folder (new) | `LocalLinkChannel` | Links on this node | Mirrors `remote-collaboration/` for the other channel | Link rules |
| `autobyteus-server-ts/src/remote-collaboration/` | Folder | Peer channel | Unchanged role | — | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `execution/links` | Main-Line Domain-Control | Yes | Low | — |
| `local-run-links` | Persistence-Provider (a channel provider) | Yes | Low | Two files |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| One delegation form in the standalone adapter | `planActivation(input) => this.options.linkedDelegation.planActivation(input, input.placement)` for every placement | `if (placement.kind === "remote_agent") linked… else hosted…` | Two paths with different gates is the problem being removed |
| The channel decides the node | `channel.startDelegatedRun({ node: THIS_NODE, …, source })` | The root calling `AgentRunService.prepareAgentRun` | A root must not know how runs are created |
| A linked team's members | `runLinks.endpointFor(agentRunId)` loads `rootTeam.members` of the linked team run once | `members` copied into the local link | Contract §3: no redundant attribute |
| Listing | The run's view: its links, minus those whose Task is closed, each with a summary read from that run (title, a team's members, statuses); opening a row opens the run | Composing the full record of every run a hub ever delegated to when the hub is opened (today: one file per delegated run; 144 for the user's hub) | QR-004: the reads per open are the hub's tree plus one per listed link |

## Design Decisions

- **D-1 One delegation form for a standalone root.** The adapter's hosted branch is removed; every placement is linked.
- **D-2 A channel for this node.** `LocalLinkChannel` implements `LinkChannel` in-process. It is the only new mechanism.
- **D-3 The link machinery is renamed** (`links`, `RunLinks`, `LinkedRun…`), because it now serves runs on this node (Principle 15).
- **D-4 A delegated run is created as an ordinary run with a back-link**: an Agent as a prepared standalone run that the work packet activates; a Team through `TeamRunService.createTeamRun`. The launch is the one the delegating side resolved.
- **D-5 The Task record's `hostRoot` keeps one meaning in this step: the root that runs the run.** For a run delegated from a standalone run: its own root. For a run hosted by a team or org run: that run (unchanged). For a run on a peer: the delegating root (unchanged). The contract's removal of the field is FU-005, when it would always name the run itself. The role value becomes `subWork` now.
- **D-6 Message routes on one node (pending requirements DEC-011).** By run ID: a run and the run it delegated to, both ways, through the link (the pair rule, as across nodes). By address: the agents of the run that delegated it (CM-5). No other route between two runs. Measured on the user's logs (`evidence/data-model-validation/cross-run-messages-2026-11-10.txt`, `non-pair-messages-2026-11-10.txt`): 1,556 of 1,600 cross-run messages are on these routes; RC-2 gives the rest and the alternative. A refused sender is told to go through the agent that delegated to it.
- **D-7 A delegated run on this node keeps the idle shutdown** that a peer-started run has; a run the user started has none, as today.
- **D-8 Listing.** A delegated run is an ordinary history row. The top-level lists leave out a run with a back-link on this node whose delegating run is stored; such a run is shown only under its delegating run. When its delegating run is not stored it is listed as a run of its own (TC-3). A peer-started run is listed as a run of its own, as today. The nested rows come, as today, from the delegating run's view: its links, without those whose Task is closed (`closed_task_executions`; a closed delegated run stays hidden, as today), each with the summary of C-5.
- **D-9 The migration** of the migration plan.
- **D-10 A delegated run's settings are the run's own.** A Settings edit writes the run's launch fields and removes its `launchSource` (the origin text applies to untouched agents only, as the earlier ticket decided). `canSwitchRuntime` admits a run with a back-link on this node; a peer-started run stays excluded as today.
- **D-11 The web tree** keeps its rows and their source (the delegating run's view), and opens a row as the run it is: an agent run through the ordinary agent run path, a team run through the ordinary team run path (its members, Team tab, files and Settings are the team run's own). The standalone run's child contexts, child stream handling, copy-only Stop and the delegated section of its Settings go. A delegated run's model is changed in its own Settings (the user, 2026-11-10).

## Review Corrections (ARCH-REV-001)

Each finding of `design-review-report.md`, with the decision and where it sits. All but RC-2 keep the approved behavior.

**RC-1 (AR-001) The Task membership of a run that is its own root.**
1. *Its agents' Task chain.* `RunLinks` gets `ownTaskChainFor(agentRunId)`: for a root whose back-link is on this node, the chain of an agent the back-link pairs with (a standalone root's host; every member of a team root) is the run's own reference (`{agentRunId}` or `{teamRunId}`); otherwise empty (a run a peer started has no Task on this node, as today). `StandaloneRootTaskExecutionAdapter.ownershipChainFor` and `TeamTaskExecutionAdapter.ownershipChainFor` (`team-task-execution-adapter.ts:136-141`) append it after the hosted chain. With it, in the run's own root: a delegation is sub-work (`new-copy-work.ts:69`), `task_id` is refused (`root-task-execution-lifecycle.ts:181`), and `assertMessageScope` / `assertInputAllowed` (`root-task-execution-resource-scope.ts:60-71`) refuse for a closed record.
2. *Input fence.* A team root's members already ask the root's fence before input (the member handle's callbacks → `assertExecutionInputAllowed`); with the chain it refuses. A standalone root's host has no fence today: `StandaloneRootMessageDelivery.readyHost` asserts `taskExecutions.assertInputAllowed(hostRunId)` before it readies the host, which covers the user's post, a linked message, the work packet and the restart notice. The refusal is the existing `TASK_AGENT_RESOURCE_CLOSED`.
3. *Stop on closure.* The Task composition's release request (`project-task-execution-resource-composition.ts:60-61`) gets one rule: an execution that is the record's `hostRoot` itself is stopped by the ordinary Stop of that run through its run service; `stopped: true` when the Stop was accepted or the run was not running. Every other execution goes to `root.releaseTaskExecutions` as today (hosted runs; the fence of a run on a peer). The run stays restorable like any stopped run.
4. *Reactivation* (DS-004b). Unchanged in the assigner's root. The adapter's Task-facing queries answer for a link on this node: `taskExecutionWithIngress` (an agent link: the run; a team link: its coordinator), `taskExecutionTargetOf`, `containsTaskExecution`, `listTaskExecutions`. `prepareClosedCopyForResume` has nothing to settle for a link (`releaseOwnedExecution` answers "no authority", which is the settled state of a run stopped in the ordinary way) and skips `assertRestorableChain`: a run that cannot be restored is reported by the linked send's result.
5. *The run's status for the Task page.* `ownRunStatus()` (Interface Boundary Mapping). The run's own root tells the Task side when it changes: the status subscription that a root with a back-link already has for its idle shutdown (`StandaloneHostIdleShutdown.watch`, `RemoteTeamIdleShutdown.onRootEvent`) also calls `taskExecutionsStatusChanged(root, [own run])`.
6. *The delegating run's closed set.* `RootTaskExecutionResourceScope.closedTaskExecutions()` returns today's set (`closedTaskExecutionsIn(root)`: the runs it hosts) plus its links on this node whose record is closed (`port.ownerOf([link]).open === false`, the in-memory Task view; one lookup per link). Live: after the Task side commits a closure, the composition calls `ActiveCollaborationRootDirectory.taskExecutionsClosed(runs)`, and each loaded root that links one publishes its `task_executions_closed` event (the directory already scans its roots for `findTeamCoordinator`). A reopen is published by the assigner's root, as today.

**RC-2 (AR-002) Routes other than the pair: a `Requirement Gap`, requirements DEC-011, for the user.** Evidence, measured read-only on the user's logs: 1,600 messages between two runs; 1,556 (97.25%) between a delegator and the run it delegated to. The other 44: 32 between two runs delegated by the same run, all in 2026-10 and none sharing a Task (the retired collaborator era); 8 between a nested run and the top run or one of its agents that did not delegate it (2026-10 and 2026-11); 4 on old records without a delegator. Recommendation (D-6): links only. Alternative: a Task route (two runs recorded in one open Task, or a Task's assigner and a run of that Task, message by run ID): it needs a Task-side lookup from a run ID to its record and its root, a second inbound rule in `linked-inbound-delivery.ts`, and the sender's reference in the transmission. Under the contract's one-hop rule (P3, CM-5) a nested run already reports to the agent that delegated to it.

**RC-3 (AR-003) Consumers of the standalone run's composed tree.** `StandaloneRootLocationService` keeps its contract ("every agent below a standalone run") by following links on this node: an agent link gives that run's host; a team link gives that team run's located agents (its members and the runs it hosts), through the team location service; recursively, one stored file per linked run, read when a consumer asks, never when a root is opened. Its consumers keep their calls:
- the token roll-up (`standalone-run-token-usage-summary-service.ts`, `token-usage-stats.ts:324-341`): the same total as today (the run and everything below it on this node);
- `api/rest/context-files.ts`: the stored locators of a delegated run's earlier attachments (`/rest/agent-collaborations/:host/agent-runs/:agent/context-files/:file`) keep resolving, with the old top run as `:host`; new attachments of a delegated run use the ordinary run's owners;
- `run-last-activity-reader.ts`, `general-process-run-supervisor.ts`, `collaboration-execution-location-service.ts`: unchanged calls;
- `standalone-root-member-view-projection-service.ts`: removed with the member queries (C-5).

**RC-4 (AR-004) Restart resume.**
- `BusyRunEntry` gets an optional `delegatingRun { kind, runId }`: the recorder writes it from the root's back-link when that is on this node (`placeOf` returns it with the root). A delegated agent run is recorded as `{ root: {agent, itself}, place: "host", delegatingRun }`, a member of a delegated team run as `{ root: {agent_team, the team}, place: "member", delegatingRun }`.
- The resumer orders entries bottom-up: an entry whose root has a `delegatingRun` that is the root of another entry is resumed before that entry; hosted `delegated` entries before their root, as today. A run's notice lists the accepted runs whose `delegatingRun` is its root, and the accepted hosted `delegated` entries of its root. The notice text does not change.
- The stop check is per entry's own root (a stopped manager's delegated run is resumed; the manager is not recorded, so not resumed).
- A record written by the previous release at the update's shutdown is rewritten by the migration (migration plan, "Busy-run record"): an entry of a converted run gets its own root, place and `delegatingRun` (the old hosting run, or its new holder for E3). Frozen copy of the entry shape in the migration.

**RC-5 (AR-005) Migration sub-cases.** Counted (`nested-counts-2026-11-10.txt`): 32 nested runs, all one level deep; 31 with the delegator in a delegated team run, 1 in a delegated agent run; 29 under a standalone top, 3 under a team top. General rule, applied top-down so a holder is converted before the runs below it: *the holder of a run is the run its delegator is a part of, after that run's own conversion.* A holder that is a standalone run (started by the user, or converted) gives an independent run (`delegatedFrom`, a link in the holder's tree); a holder that is a team run gives a hosted run (`taskAgent`, `coordinatingRun` = that team run, a record in its tree), and every run below it in the chain is hosted by that same team run, as the team's hosting already records chains. A top run that is a team or org run: nothing below it is touched. E4: all 4 are held by team or org runs (measured), so this step writes no back-link without a delegator; were a standalone run to hold one, its delegator is that run's own ID (a standalone run has one agent). `delegatedFrom.delegatorAgentRunId` stays required in current code. Fixtures: F-E3a, F-E3b, F-E3c (untouched), and a two-level chain below a delegated team run (built from the rule; none exists in the data).

**RC-6 (AR-006) One source for nested rows.** The delegating run's view (DS-008, D-8, D-11, the Listing example, C-5 aligned). Reads per open of a hub with n links, k of them listed (Task open, run stored, not archived): the hub's tree, n in-memory Task lookups, and k summaries (a loaded run answers from memory; otherwise one small file: its run file or team tree). Today: the tree plus one file per link (144 for the user's hub).

**RC-7 (AR-007) Archive and delete of a delegated run itself.** Like any run, and refused while a run it delegated to is working (REQ-007). Its link stays in the run that delegated it; the view lists a link only when its run is stored and not archived, so an archived run leaves the tree until it is unarchived and a deleted run leaves it for good (the earlier contract's rule L5: a run that cannot be read is left out, never an error). A message to it is refused with the existing texts (archived; not found on this node). Its Task record keeps the entry, as for any run that no longer exists. No new rule.

**RC-8 (AR-008) Opening the collaboration view starts nothing.** `agent-collaboration-stream-handler.ts`: `readyRoot` (`:59-64`, used at `:73` and `:148`) is replaced by `roots.resolveRoot`; `ensureHostReady` leaves the connect and the command fallback. The snapshot's `is_active` (`:89`) is the root's state, as the GraphQL read already reports it (`standalone-agent-run-root-manager.ts:318`); `StandaloneAgentRunRoot.isHostLive` and `StandaloneHostAgentHandle.readiness` lose their only production caller and are removed. The client follows the stream while the run's own agent runs or the view is active (`agentRunCollaborationStore.syncHost`, `useAgentRunCollaborationSync`).

**RC-9 (AR-009) Peer-only pieces.** `execution/remote/` keeps what is about a peer: `peer-discovery-channel.ts`, `paired-agent-access.ts`, `remote-child-commands.ts`, `remote-run-observation.ts`, and `remote-run-channel.ts` reduced to the peer-only operations (`findPeer`, `peerName`, `agentProjection`, `observeRun`) as `RemoteRunChannel extends LinkChannel`. `execution/links/` gets `link-channel.ts` (`startDelegatedRun`, `deliverMessage`, `ownerCommand`, `runSummaries`, `standingInstanceAt`), `run-links.ts`, `linked-run-endpoint.ts`, `linked-run-reference.ts` (from `remote-run-reference.ts`; `nodeId` optional), `linked-run-delegation.ts`, `linked-message-send.ts`, `linked-task-activation.ts`, `link-refusal-codes.ts`, `linked-inbound-delivery.ts`. `LocalLinkChannel` implements `LinkChannel` only.

**RC-10 (AR-010)** The investigation notes' status, supplement inventory and unknowns are brought up to date; requirements ASM-003 is closed with notes F-2 and F-3.


## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the hosted branch for existing delegated runs of standalone runs | No migration | Rejected | The migration converts them |
| Read `taskAgent` as `delegatedFrom` in current code | A tolerant reader instead of a migration | Rejected (a stored name with a wrong meaning; guideline §3) | Migration |
| Keep `coordinatingRun` on the wire between nodes | Mixed versions | Rejected (`DESIGN.md` rule 9) | Rename |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Rename the link machinery (no behavior change; tests green).
2. `LocalLinkChannel`, the starter and the shared receiver; the standalone adapter takes the linked path for every placement; the capabilities of notes F-3 (saved Task, files, follow-up Task, same-Task messages, standing instance by address, stop on Task closure).
3. Remove the hosted path from the standalone root and the copy-only features.
4. The Task record (`subWork`, `hostRoot` for independent runs); history admission and rows.
5. The migration with fixtures for every shape.
6. The web tree.
7. Docs.

Steps 2 and 3 land together (no state with both paths in a standalone root).

## Key Tradeoffs

- **Reuse the cross-node machinery in-process** instead of a second, local-only way to relate roots: one model, one set of rules; the cost is a rename and a channel implementation.
- **`hostRoot` kept with a truthful meaning** for three more steps instead of a conditional field: one rule for the Task side while two forms of delegation exist.
- **Delegated runs become history rows**: the list grows by the number of delegated runs (nested, so not at the top level); in exchange the copy-only views go and opening a hub no longer reads every delegated run (QR-004).

## Risks

- The surface of REQ-009 is wide; a capability may depend on in-root hosting in a way not yet read (token roll-up, the Task page's locator, `@` mentions). Each is listed in the validation plan; one that cannot be served through a link returns to the requirements.
- Cross-root delivery: two roots' gates and logs in one message; the order (receiver's log first) and the exactly-once rule must hold as on the cross-node path (QR-002).
- The migration meets shapes from several earlier releases; the new migration needs frozen copies of each source shape (migration plan).
- The web change replaces a central part of the standalone run's view.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: the two Stop tests in `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts` (lines 201 and 570) assert the hosted behavior; they are rewritten for independent runs.
- The migration's fixtures follow the guideline §9: small hand-built records of every shape of the contract's §5, checked against the counts file's shapes.
- The file lists of File-Level Completion come from searches at `aae0a53a81`; the implementation repeats each search and reports a file not listed.
