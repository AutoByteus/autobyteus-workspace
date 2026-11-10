# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-008`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-007` with `target-collaboration-contract.md` revision 2 (the user, 2026-11-10; details in the requirements' Document Status)
- Behavior-defining supplements and their approval references: `target-collaboration-contract.md` revision 2, approved by the user on 2026-11-10
- User approval of the design, when the direction requires it: `Pending` (the Task: "Design first; the user approves the direction before the build")
- Design status: `Draft` — the mechanism, the cut line, the decisions and the server structure are decided and evidenced; the sections marked **OPEN** below (the web client's files, the history index code, the migration's released-reader list) are not yet at file precision and are completed before any handoff. The earlier spec of SR-003 (change only what Stop covers) is superseded; it is in git at `3a298ba009`.
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
| Code (`Read`) | `run-history/store/agent-run-metadata-store.ts:90-176` (the reader returns a standalone run only without `taskAgent`), `task-agent-team-tree-schema.ts:77-90`, `task-agent-own-records.ts` | Delegated runs are hidden from the ordinary readers by the `taskAgent` section | D-8, D-9 | History index code not read (**OPEN**) |
| Code (`Read`) | `agent-execution/services/standalone-agent-run-eligibility.ts:15-16` | `canSwitchRuntime` excludes a run with `delegatedFrom` | D-10 | Why a peer-started run is excluded is not recorded |
| Data (`Measured`) | `evidence/data-model-validation/counts-2026-11-10.txt` | Every stored run converts; counts per shape | D-9 | — |
| Earlier tickets (`Read`) | `delegated-copy-model-change/requirements-doc.md` REQ-005, DEC-005; `delegated-copy-own-run-memory/requirements-doc.md` DEC-015 (U-1) | The Settings edit is kept beside the started launch so the origin text shows only on untouched agents and the composed record round-trips | D-10 (contract V-9) | None |
| Web (`Read`) | `components/workspace/history/AgentRunTaskRows.vue`, `stores/agentRunCollaborationStore.ts` (`taskRows`, `selectTaskRow`, `childTargetFor`), `composables/mobile/useMobileRunTree.ts`, `stores/remoteRunsStore.ts` (named, not read) | A standalone run's delegated rows and their contexts come from its collaboration view | D-11 | Files below the store not read (**OPEN**) |

## Intended Change

Delegations made from a standalone agent run use links only. A target on this node gets an ordinary run with `delegatedFrom`, under its own root; the delegating root keeps a link and reaches it through the same link owner and endpoints as a run on a peer, over a channel that has a second, in-process implementation for this node. The hosted path leaves the standalone root. Existing data is converted by one startup migration.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-008. Areas: `agent-collaboration/execution/remote` (renamed `links`), `standalone-agent-run-root`, a new local start and delivery for linked runs, `agent-execution` (prepared run with a local back-link, runtime-switch rule), `agent-team-execution` (a team run with a local back-link: admission, pairing; nothing in its hosting), `projects` (Task record role, `hostRoot` meaning, release and status), `run-history` (admission, rows, metadata reader), `restart-resume`, `app-data-migrations` (one migration), `autobyteus-web` (tree rows and opening of a standalone run's delegated runs), the Collaboration Model, Glossary and module docs.
- Derived consumers, when a stored or shared structure changes: **OPEN** at file level for V-8 (readers of `taskAgent` 11 files, `coordinatingRun` 18, `delegatedFrom` 22, `hostRoot` 14, outside migrations). Decided by kind: readers of `delegatedFrom.coordinatingRun` take `delegatingRun` (rename); readers of `taskAgent` stay for runs hosted by team and org runs; `hostRoot` readers keep the field with the one meaning of D-5.
- Deliberately left alone: hosting inside team runs and org runs (`TeamTaskExecutionAdapter`, `AgentOrgTaskExecutionAdapter`, their registries), which also serves delegations by the members of a delegated team run (notes F-5); `RootTaskExecutionLifecycle` (still used by all three roots; by the standalone root for linked runs only); the peer protocol's requests except the renamed field; remote feature gaps (`collaboration_model.md` § 4).
- Follow-ups: FU-002 (two oversized files; the standalone root shrinks in this change), FU-003, FU-004, FU-005.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-004 | User | REQ-001 / AC-001, AC-004 | Stop on a run | The root ends its hosted runs first | Each run has its own root; Stop is the ordinary Stop of that root | DS-005 |
| BEH-003 | System | REQ-003 / AC-002, AC-003 | `send_message_to` | In-root delivery; a host is made ready first | Through the link; the receiving root is resolved or restored, then its agent is made ready | DS-002, DS-003 |
| BEH-005 | Contract | REQ-005 / AC-005 | Task closed, reopened, follow-up Task | The hosting root releases the run | The Task side reaches the run's own root | DS-004 |
| BEH-006 | Operational | REQ-008 / AC-009 | Update restart | Entries of a stopped root are skipped | A delegated run is recorded under its own root | DS-007 |
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
- Older persisted schema version(s) that require transformation: for runs whose holder is a standalone run (170 in the user's data, less the nested ones that move to a team run): E1, E2, E4, E5, E6, E11; for every Task record: E13 and the `hostRoot` value of D-5; nested runs (E3, 32): link moved to the team run that holds them, `coordinatingRun` set to that team run (they stay hosted there); E12 (`coordinatingRun` → `delegatingRun` on a peer-started run; 0 in the user's data).
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
- Historical migration retention decision: released migrations that read these shapes through current code are repointed to frozen copies (**OPEN**: the list, contract V-11; the earlier contract's §5.4 is the starting inventory).

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| Own file | `taskAgent` section (agent run file, team tree) | `delegatedFrom`; launch facts at the run's own place (D-10) | The migration | Frozen target validator | Item left as it was; counted; retried next start |
| Agent address | `taskAgent.address` | `collaboration/collaboration_tree.json` `host.address` | The migration | Reread | As above |
| Nested link | Link in the standalone run's tree | Link in the team run's `rootTeam.taskExecutions`; `taskAgent.coordinatingRun` = that team run | The migration | Reread both trees | The link is written to the target tree before it is removed from the source tree; seen in both on retry → the source copy is removed |
| History rows | none | A row per run that became ordinary | The migration, through a port to the history index writer | Reread | Missing row added on retry |
| Task record | role `delegated`; `hostRoot` = the old coordinating run | role `subWork`; `hostRoot` = the root that runs it | The migration | Frozen target validator | Per file |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-011 | `delegate_task` in a standalone run | A new ordinary run with its work | The delegating root's task lifecycle (existing) | The one delegation form |
| DS-002 | Primary End-to-End | BEH-003 | `send_message_to` (delegator → delegated run) | The delegated run's agent has the message | The delegating root (send), the delegated run's root (receive) | Wake by message |
| DS-003 | Primary End-to-End | BEH-003 | `send_message_to` (delegated run → delegator, by run ID or address) | The delegator has the message | The delegated run's root (send), the delegating root (receive) | The report |
| DS-004 | Primary End-to-End | BEH-005 | A Task closes | Its runs are stopped | The Task service | The Task owns the work |
| DS-005 | Primary End-to-End | BEH-001 | Stop | That run stopped | Each run's own manager (existing) | By construction |
| DS-006 | Primary End-to-End | BEH-007 | Archive / Delete | Refusal or the history change | The history gate | TC-2 |
| DS-007 | Primary End-to-End | BEH-006 | Startup after an update | Busy runs resumed | `RestartResumer` (existing) | No special rule left |
| DS-008 | Primary End-to-End | BEH-009, BEH-011 | The run tree | A delegated run opened as a run | The web run tree | The relationship shown |
| DS-009 | Primary End-to-End | BEH-010 | Startup | Data in the target shape | The migration | Existing runs |

## Primary Execution Spine(s)

- DS-001: `delegate_task -> StandaloneAgentRunRoot.delegateToNewCopy -> RootTaskExecutionLifecycle (work, Task link, dispatch) -> StandaloneRootTaskExecutionAdapter.planActivation -> LinkedRunDelegation -> LinkChannel(this node).startDelegatedRun -> LocalDelegatedRunStarter -> AgentRunService.prepareAgentRun | TeamRunService.createTeamRun (with delegatedFrom) -> adapter commits the link -> LinkChannel.deliverMessage(work packet) -> the new run's root.acceptLinkedWorkPacket -> its agent starts`
- DS-002: `send_message_to(run ID) -> delegating root deliverExact -> RunLinks.endpointFor -> LinkedMessageSend (engine prepares, log line) -> LinkChannel(this node).deliverMessage -> LinkedMessageReceiver -> stored link check -> CollaborationRootResolver.resolveOrRestore -> target root.acceptLinkedMessage -> its agent made ready -> input`
- DS-003: the same in the other direction through the `delegator` endpoint built from `delegatedFrom`; by address: `the delegated run's recipient resolver -> not in its own run -> the delegating run's standing instance at that address (asked through the link channel) -> the same send`.
- DS-004: `update_task DONE -> ProjectTaskService -> TaskExecutionResourceRelease -> request(hostRoot = the run's own root, [run]) -> that root.releaseTaskExecutions -> the run stops, input fenced by the closed record`
- DS-008: `run list (history rows; a row with delegatedFrom on this node is placed under its delegating run's row) -> select -> the ordinary run opening path -> /ws/agent/:runId or the team stream`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing lifecycle prepares the work and its Task, then asks the adapter for an activation. The adapter has one path: a linked delegation. For this node the channel starts the run locally with the launch the delegating side resolved (the Project's folder, inheritance, tool approval), and the run is an ordinary prepared standalone run or a created team run. The link is committed in one tree write; the work packet starts the agent or the team's coordinator. | Delegation, link, run | The delegating root's lifecycle | Launch resolution (existing `CollaboratorAdmission`), Task link (existing) |
| DS-002, DS-003 | A message between a run and a run it is linked with leaves through the sender's root (engine: scope check, log line) and enters through the receiver's root (link check against stored links, restore when inactive, the agent made ready). On one node the channel calls the receiver directly. Reference files pass unchanged on this node. | Message, link, root | Sender's root, then receiver's root | Message logs (both), Task scope |
| DS-004 | The Task record names the root that runs each of its runs. For an independent run that is the run's own root, which stops itself; for a run still hosted by a team or org run, that run, as today. | Task, run | Task service | — |
| DS-008 | A delegated run is a history row. The tree places it under its delegating run by the row's `delegatedFrom`; opening it is opening a run. The delegating run's view carries its links (for the Task-closed mark and the order), not the delegated runs' content. | Run rows | Web run tree | Status poll of listed runs (existing) |
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
| The standalone root's child presentation (`CollaborationAgentPresentationEventAdapter` use, `agent_presentation` events for children, `collectStandaloneRootAgentStatusSnapshots`, `collectStandaloneRootInputSnapshots`, the member view projection service for children, the child context-file owners and routes) | Children are not parts of the run | Each run's own stream and views | **OPEN**: the exact file list on the web side |
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
| Root: `releaseTaskExecutions([own run])` | A root with a back-link | Stop this run because its Task closed | The run's own reference | The Task side's existing request, addressed to the run's own root (D-5) |
| GraphQL / WS | — | **OPEN**: the history row's `delegatedFrom` field; removal of the standalone child commands on `/ws/agent-collaboration` | — | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LinkChannel` | Yes | Yes (node + root + agent run ID) | Low | — |
| `releaseTaskExecutions` on a root | Yes | Yes | Low | Removed with `hostRoot` in FU-005 |

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
| `run-history` | Admission and rows of delegated runs | DS-008 | Catalogs | Extend | **OPEN** files |
| `app-data-migrations` | DS-009 | DS-009 | Runner | Extend | — |
| `autobyteus-web` | The tree and opening of delegated runs | DS-008 | Run tree | Extend | **OPEN** files |

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

Server files at the precision reached; **OPEN** rows are completed before handoff.

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/links/run-links.ts`, `linked-run-endpoint.ts`, `link-channel.ts`, `linked-run-delegation.ts`, `linked-message-send.ts`, `linked-task-activation.ts`, `link-refusal-codes.ts` (moved and renamed from `execution/remote/`) | links | `RunLinks` | As today, without the word "remote"; local links admitted; a saved Task, reference files and a follow-up Task allowed for a link on this node | Existing files | Link |
| `local-run-links/local-link-channel.ts` (new) | local-run-links | `LinkChannel` for this node | In-process start, deliver, command, summaries, standing instance | One implementation | — |
| `local-run-links/local-delegated-run-starter.ts` (new) | local-run-links | Starter | Resolved source → prepared agent run or created team run with `delegatedFrom`, launch facts recorded on the run | One concern | `DelegatedFrom` |
| `remote-collaboration/inbound/remote-message-receiver.ts` → shared receiver in `links` or `local-run-links` (**OPEN**: placement) | — | Inbound | One inbound rule for both channels | — | — |
| `compositions/link-channel-composition.ts` (new) | compositions | Channel routing by node | Binds the two implementations | Composition | — |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `services/standalone-root-task-execution-adapter.ts`, `standalone-root-message-delivery.ts`, `standalone-root-builder.ts`, `standalone-agent-run-root-manager.ts`, `persistence/standalone-root-package-store.ts`, `standalone-root-execution-index.ts`, `standalone-root-recipient-resolver.ts`, `standalone-root-collaborators.ts` | standalone root | Root | The reductions of the removal plan; `acceptLinked*`; own-run release | Existing | Link |
| `agent-execution/services/standalone-agent-run-eligibility.ts` | agent-execution | Runtime-switch rule | D-10 | Existing | — |
| `agent-team-execution/domain/team-run-remote-links.ts` (renamed), `services/remote-team-idle-shutdown.ts` (renamed), team tree schema and admission | team execution | Team root with a back-link | A back-link without `nodeId`; `releaseTaskExecutions` for its own run | Existing | `DelegatedFrom` |
| `projects/domain/task-execution-resources.ts`, `stores/task-execution-resource-schema.ts`, `services/task-execution-resource-service.ts`, `compositions/project-task-execution-resource-composition.ts`, `task-execution-resource-port.ts` (role type) | projects | Task record | `subWork`; `hostRoot` meaning | Existing | — |
| `run-history` catalogs, index stores, GraphQL run-history types (**OPEN**) | run-history | Rows | `delegatedFrom` on a row; delegated runs admitted | — | — |
| `restart-resume/restart-resumer.ts` | restart-resume | — | No change expected (a delegated run is recorded under its own root); verified by a test | — | — |
| `app-data-migrations/migrations/<date>_delegated_runs_of_agent_runs_as_runs/*`, `frozen/*` additions | migrations | The migration | Migration plan | Sealed area | Frozen copies |
| `autobyteus-web`: `AgentRunTaskRows.vue`, `utils/runTreeProjection.ts`, `utils/mobile/mobileRunTreeProjection.ts`, `composables/mobile/useMobileRunTree.ts`, `useMobileRunOpening.ts`, `stores/agentRunCollaborationStore.ts` and `services/agentCollaboration/*`, `stores/activeContextStore.ts`, `components/runList/RunListRow.vue`, the Settings editor's delegated section (**OPEN**: confirm and complete) | web | Run tree | Rows from history; opening as a run; removal of child contexts of a standalone run | — | — |
| `docs/design/collaboration_model.md`, `GLOSSARY.md`, `docs/modules/standalone_agent_run_root.md`, `agent_communication.md`, `remote_collaboration.md`, `projects.md`, `run_history.md`, `restart_resume.md`, `agent_memory.md` | docs | — | The contract and the mechanics | — | — |

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
| Listing | history row `{ runId, …, delegatedFrom: { delegatingRun, delegatorAgentRunId } }`; the tree nests it | The delegating run's view carrying every delegated run's members and status | QR-004; the earlier contract's H2 cost goes away |

## Design Decisions

- **D-1 One delegation form for a standalone root.** The adapter's hosted branch is removed; every placement is linked.
- **D-2 A channel for this node.** `LocalLinkChannel` implements `LinkChannel` in-process. It is the only new mechanism.
- **D-3 The link machinery is renamed** (`links`, `RunLinks`, `LinkedRun…`), because it now serves runs on this node (Principle 15).
- **D-4 A delegated run is created as an ordinary run with a back-link**: an Agent as a prepared standalone run that the work packet activates; a Team through `TeamRunService.createTeamRun`. The launch is the one the delegating side resolved.
- **D-5 The Task record's `hostRoot` keeps one meaning in this step: the root that runs the run.** For a run delegated from a standalone run: its own root. For a run hosted by a team or org run: that run (unchanged). For a run on a peer: the delegating root (unchanged). The contract's removal of the field is FU-005, when it would always name the run itself. The role value becomes `subWork` now.
- **D-6 Message admission on one node:** the pair rule (delegator and delegated run) or the same-Task rule (today's scope, checked by the engine) admit a message by run ID; the receiver's stored link check uses the same rules.
- **D-7 A delegated run on this node keeps the idle shutdown** that a peer-started run has; a run the user started has none, as today.
- **D-8 Listing:** a run with `delegatedFrom` on this node is listed under its delegating run when that run is stored, else as a run of its own (TC-3). A peer-started run is listed as a run of its own, as today.
- **D-9 The migration** of the migration plan.
- **D-10 A delegated run's settings are the run's own.** A Settings edit writes the run's launch fields and removes its `launchSource` (the origin text applies to untouched agents only, as the earlier ticket decided). `canSwitchRuntime` admits a run with a back-link on this node; a peer-started run stays excluded as today.
- **D-11 The web tree** shows delegated runs of a standalone run as nested run rows and opens them as runs; the standalone run's child contexts, child stream handling and copy-only controls go.

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
- The migration meets shapes from several earlier releases; released migrations that read through current readers must be repointed (**OPEN** list).
- The web change replaces a central part of the standalone run's view.

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: the two Stop tests in `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts` (lines 201 and 570) assert the hosted behavior; they are rewritten for independent runs.
- The migration's fixtures follow the guideline §9: small hand-built records of every shape of the contract's §5, checked against the counts file's shapes.
- **OPEN items to close before handoff:** V-8 reader list; the history index files; the web file list; the released-migration repoint list; the placement of the shared inbound receiver; the GraphQL and stream shape changes.
