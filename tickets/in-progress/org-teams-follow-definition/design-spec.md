# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-013` (SR-013: step 2 of runs delegated by an Org unit, after CRR-001 CR-001; SR-012 aligns the contract after `ARCH-REV-006`: cross-unit `counterpart` on both lines with Org addresses, one application-ownership rule, delegation-records residue; SR-011 adds the storage contract and its validation, at the user's request; SR-010 revises after `ARCH-REV-004`: § SR-010 Revision fixes the meaning of `P`; SR-009 revises after `ARCH-REV-003`: § SR-009 Revision supersedes R-1's list of points; SR-006 revised SR-005 after `ARCH-REV-001`; SR-007 applied the user's DEC-006; SR-008 revises after `ARCH-REV-002`: § SR-008 Revision supersedes R-1, R-3's snapshot paragraph and R-4 (a))
- Approved requirements: `requirements-doc.md` at SR-004 (REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-005), approved by the User on 2026-11-21 (quotes in the requirements' Document Status); direction SR-002 (Org as a container of runs).
- Behavior-defining supplements: autobyteus-22's approved behavior and texts (archived `tickets/done/team-run-follows-definition/`), reused unchanged; **`org-container-storage-contract.md` (SR-011): the normative on-disk contract (every file, the conversion field by field, use cases), validated in `contract-validation.md`**.
- User approval of the design: `Not required`.
- Design status: `Ready`
- Investigation: `investigation-notes.md` (IF-01..IF-14, AF-01..AF-09).
- Base: `origin/personal` `9f6add773b`; branch `codex/org-teams-follow-definition`.
- Authorities read (2026-11-21): `references/architecture-design.md` (with the mandatory migration-conventions check), `references/design-principles.md`, `templates/design-spec-template.md`, `DESIGN.md`, `data_migration_guideline.md` (all sections), `collaboration_model.md`, `agent_orgs.md`, autobyteus-22's design (SR-010).
- Conflicts or discrepancies: the collaboration model's storage shape (§3: "an Org's units live inside that run's folder") changes by user decision; this change updates the contract (CM-3, §3, §5).

## Current-State Read

An Org run is one root (`AgentOrgRun`): it hosts its direct agents (configured-agent handles) and mounted Teams (flat Team execution inside the root), owns one tree (`agent_org_run_execution_tree.json`: `rootOrg.members` with Team `teamRunId`s and agent `agentRunId`s, one `handoffs`), one message log, one launch, one view stream (`org-view-session.ts`), and is the delegating run of its members' delegations (AF-01..AF-05). Since autobyteus-461, delegated runs are roots of their own with cross-run messages in both logs, parent views of child runs, and step-2 address resolution into a coordinating run's standing agents (IF-11). Since autobyteus-22, every Team root follows its definition (`agent-team-execution/membership/`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — Org execution (≈3,200 lines) reshaped into a container, Team and agent run roots gain a container back-link, cross-run messaging inside a container, Org view composition, run tree rows, history/memory readers of Org runs, task delegation origins, a sealed migration of stored Org runs and their Task records, Org-definition following, and the FU-003 peer notice.
- Architectural risk: `High` — persisted-data migration of every Org run; collaboration-contract change (CM-3, §3); runtime ownership moves; cross-run messaging and wake rules; peer protocol addition.
- Escalation trigger: any Org behavior in the preserved boundary (launch, view, focus, Stop/reopen, delegation, history) that cannot be kept by composition, or a released Org shape the conversion cannot map → `Design Impact`.

## Intended Change

The Org run becomes a container. Each mounted Team is a Team run (`agent_teams/<teamRunId>/`) and each direct Org agent an agent run (`agents/<agentRunId>/`), each carrying a fixed back-link `containedIn: { orgRunId, address }`. The container (`agent_orgs/<orgRunId>/`) keeps the Org's definition reference, launch, its units (address → run), its former units, and the Org-level rules. Units message each other by Org address across runs (both logs). The container composes its units into today's Org view and run-tree rows, and follows its Org definition (units join and leave). Team units follow their Team definition through autobyteus-22 unchanged. Stored Org runs are converted at startup. FU-003 adds a signed peer notice so a delegating node's record of a peer Team copy follows its membership.

## Change Scope (Mandatory)

- In scope: UC-001..UC-006. Areas: `agent-org-execution` (container root, planner, follow), `agent-team-execution` and the standalone agent root (`containedIn`, cross-run step 2 into the container), `agent-collaboration` (container address resolution, Org-rule merge for a unit's rules, delegation origin), `agent-collaboration/delegation` (rows for container units), `services/agent-streaming` (Org view composition, command routing), `run-history` / `agent-memory` (Org readers over units; contained runs not listed as top-level runs), `app-data-migrations` (new migration and follow-ups), `remote-collaboration` (FU-003), docs (collaboration model, agent_orgs, agent_memory, glossary).
- Derived consumers: the 28 `agent_org` sites (AF-05) get a disposition each in implementation, by this rule: a site that treats the Org run as the host of its members' execution, log or delegations moves to the unit run; a site that lists, shows or launches the Org stays on the container.
- Deliberately left alone: the web Org workspace (it keeps its one Org stream), Org definitions and their editor, Team runs outside Orgs, standalone agent runs outside Orgs, placement copies, application-bound Orgs (they convert like others; the container keeps its binding and each unit carries the same ownership, written once: a Team unit's `applicationBinding`, an agent unit's `applicationExecutionContext`; so every unit of an application-owned Org is application-owned, not followed and Settings-blocked, as today; contract §11, SR-012).
- Follow-ups: none yet.

## Relevant Behavior And Production-Path Map

| REQ / AC | Trigger | Target path / spine |
| --- | --- | --- |
| REQ-001, AC-001 | Org launch | DS-001 |
| REQ-002, AC-002 | Team definition change | autobyteus-22 DS-001 on the Team unit (unchanged) + DS-006 |
| REQ-003, AC-003 | Unit messages a unit by address | DS-002 |
| REQ-004, AC-004 | Unit membership or Org definition change | DS-006 |
| REQ-005, AC-005 | Org Stop / reopen | DS-003 |
| REQ-006 | Org view, rows, history | DS-004 |
| REQ-007, AC-006 | Upgrade | DS-005 (migration) |
| REQ-008, AC-007 | Peer Team copy membership change | DS-007 |
| REQ-009, AC-008 | Org definition change | DS-006 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (restructuring by user direction).
- Current design issue found: `Yes` — the Org run hosts its units as parts while the contract calls it a container (IF-10); Team logic runs twice (as Team roots and inside the Org root), so Team-level features (autobyteus-22) don't reach Org Teams.
- Root cause classification: `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes` (the whole change).
- Structural triggers: Persisted-data transition (migration, below); Several kinds (agent unit, Team unit, container; local and peer); Capability-area reuse (Team roots, standalone agent roots, cross-run delivery, delegation index, platform notices, autobyteus-22 membership); Derived data (Org rows and view composed from units, not stored twice); Backward dependency (a unit needs its container for step-2 addresses and Org rules; the container drives its units' lifecycle: the unit holds only the fixed back-link and asks the container through a narrow port; the container owns the sequence); Hidden dependency (none added: the container directory is passed in by the composition root); Vocabulary drift (`containedIn` is new; "unit" stays the contract's word; "member" stays for a Team's agents).
- Deliberate deviations: None.

## Terminology

- **Org container** (the Org run after this change): the run that groups an Org's units; it hosts no agent execution.
- **Unit** (contract word, CM-3): a direct Org agent or a mounted Team; now a run of its own.
- **`containedIn`**: a unit run's fixed back-link `{ orgRunId, address }` (its Org address). GLOSSARY entry.
- **Former unit**: a unit removed by an Org definition change; kept in the container (history), like autobyteus-22's former members.

## Persisted Data / State Transition Decision (Mandatory)

- Subjects: every stored Org run: `agent_orgs/<orgRunId>/agent_org_run_execution_tree.json` (released Org tree v1), its member folders (`agent_orgs/<orgRunId>/<teamRunId>/<agentRunId>/`, `agent_orgs/<orgRunId>/<agentRunId>/`), its message log (`agent_org_communication_messages_*.jsonl`), its Task delegation records (`agent_org_task_delegation_records.json`, released v1 frozen), Task entries and delegated runs' `delegatedFrom` that name the Org run as delegating run, and the Org run history index (`agent_org_run_history_index.json`).
- Decision: `Migration Required` — the run owner of each member's memory, log lines and delegations changes (a change of meaning, guideline §2.1), which no tolerant reader can absorb. Approved by the user (DEC-001).

### Migration Plan

- Migration: `20261122_agent_org_units_own_runs_v1` (`app-data-migrations/migrations/agent-org-units-own-runs-v1/`), appended at the end of the registry (guideline §4; CR-461-048), `requiredOnStartup`, no capability hold.
- Source shapes: Org tree v1 (frozen `released-*` copies in `frozen/`, from `agent-org-flat-team-families-v1`), Org task delegation records v1 (frozen), Org message log lines (released shape frozen in this migration's folder), Task entries with `delegatedFrom.delegatingRun.kind = "agent_org"` (released shape from `delegated-runs-own-runs-v1`'s frozen task records), standalone agent `run_metadata.json` and Team tree target shapes (current at the time of writing, frozen as this migration's targets). Shape inventory: from the user's data read-only (IF-05, IF-13) and released code; one fixture per shape, including Orgs with only agents, only Teams, both, an Org whose Team tree is missing (predecessor skip), a delegation from an Org member to a local and a peer run, and a log with intra-Team, cross-unit and user→member lines.
- Per Org run, in order, each step atomic per file, sources kept until targets validate (§7):
  1. Classify: current container (has `units`) → already done; Org tree v1 → convert; missing/unreadable tree → preserved skip with warning (§6).
  2. Each mounted Team: rename `agent_orgs/<org>/<teamRunId>/` → `agent_teams/<teamRunId>/` (rename, not copy: `team-agent-memory-layout` lesson); write `team_run_execution_tree.json` from the Team node: members and coordinator at their stored Org addresses (no rebasing, R-1), the Team's own rules (Org handoffs whose `from` and `to` are both inside the Team), launch (Team node's), `containedIn: { orgRunId, address }`.
  3. Each direct agent: rename `agent_orgs/<org>/<agentRunId>/` → `agents/<agentRunId>/`; write its `run_metadata.json` (identity, definition, launch from the node, workspace) with `containedIn`.
  4. Split the message log: a line between two members of one Team → that Team run's log; a line between two units (or a user line to a unit) → both runs' logs (receiver first, one message ID, CM-9); lines keep their IDs and times; addresses kept (R-1); lines with a party outside the Org per R-4 (b); the Org log is kept as inert residue only after all target logs validate (§6 Residue), then removed in the same migration (the container has no log).
  5. Delegations: Task entries and delegated runs' `delegatedFrom` that name `{ agent_org, orgRunId }` with a `delegatorAgentRunId` → the delegator's unit run (`agent` run, or `agent_team` run whose member it is); old entries with no delegator (contract E6: 4 old runs) → the container keeps them as preserved history (warning).
  6. Rewrite the container file: `rootOrg.units` (address, kind, runId, definitionId), launch, Org-level rules (the Org definition's own rules as stored: handoffs not wholly inside one Team), `formerUnits: []`; the Org run history index entry stays; contained runs are not added to the top-level run indexes.
- Earlier migrations classified (§4): implementation lists every registry entry as writer / reader / rebuilder / none against code; at least `agent-org-flat-team-families-v1` (writer of Org trees), `delegated-runs-own-runs-v1` (writer/reader of Task entries and delegated runs), `agent-org-*` context-file locators (writer of Org-scoped locators) need follow-ups (prerequisites: predecessor + this; idempotent by structure).
- Interruption: on retry, a unit whose target folder exists with a valid target file and `containedIn` is recognized as done; the remaining units continue; no journal (§7 retry example).
- Dispositions and status: `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` (preserved skips) / `FAILED` per guideline §6; a failed Org run is isolated (excluded from lists and restore), never a startup lockout (§1).
- Rollback: not possible (older builds can't read containers); release notes say so (§4 "Rolling back").
- Acceptance (§9): released-shape fixtures above, retry/partial, repeat startup, all-Org-runs-excluded with new work usable, cost measured on a synthetic large Org.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary: start | Org launch page | Container + unit runs created, all Offline | `AgentOrgRunService` → `AgentOrgContainer` |
| DS-002 | Primary: unit → unit by address | `send_message_to('/x')` in a unit | Delivered in the target unit run (woken if needed); both logs | sender root → `AgentOrgContainer` → target root |
| DS-003 | Primary: Stop / reopen | User Stop / open | Units stopped / container reopened, units restored on demand | `AgentOrgRunManager` |
| DS-004 | Primary: Org view | Window opens the Org | Today's Org stream composed from units; commands routed to unit roots | `OrgViewSession` |
| DS-005 | Primary: conversion | Startup | Stored Org runs converted | migration |
| DS-006 | Primary: follow | Definition announcement / unit membership change | Org units and Org rules follow; notices | `AgentOrgContainer` (Org planner) |
| DS-007 | Primary: peer members | Peer Team copy committed membership change | Delegating node's Task entry members updated | peer root → peer channel → delegating node Task resources |

## Primary Execution Spines

- DS-001: `Org launch page → AgentOrgRunService (plan + validate, as today) → AgentOrgRunManager.create → AgentOrgContainer.create: container file, then per unit: TeamRunService.createTeamRun / AgentRunService.create with containedIn and its resolved launch (no member started) → register container → view`
- DS-002: `unit member send_message_to('/concierge') → its root's resolveMessageRecipient (step 1 own Team; step 2 → container port `placementAt(address)`) → AgentOrgContainer resolves the unit run (+ member address in its space) → target root deliverFromContainedUnit (restores the target unit root if stopped; members activate lazily) → saved in sender's and receiver's logs (CM-9) → container publishes to the Org view`
- DS-003: `Stop → AgentOrgRunManager → container stops each live unit root (their managers) → container stopped`; `open → restore container (file) → units restored when first needed (message, command, view focus on a running member)`.
- DS-004: `OrgViewSession → AgentOrgContainer.openView: snapshot = units' snapshots composed into today's Org snapshot (Org addresses), events = units' sequenced events re-projected with Org addresses in one order → web (unchanged contract)`; `command(agent_run_id) → container → owning unit root`.
- DS-006: `announce or a unit's team_membership_changed → AgentOrgContainer.follow → Org planner (pure: stored container + Org definition view + units' current members) → locked container write (units, formerUnits, Org rules) → create added unit runs (Offline) / retire removed units (autobyteus-22 leaving rules per member, then stop the unit root) → notices to agents whose merged rules changed → rows + view refresh`.
- DS-007: `peer node: Team root committed change (autobyteus-22 committer) with delegatedFrom.nodeId → PeerRunMembersNotice (signed, existing peer client) → delegating node RemoteInbound: verify link → TaskExecutionResourcePort.updatePeerRunMembers(taskEntry) → DelegationIndex.entriesChanged → rows`; on the next contact (status/observation answer now includes members) the delegating node reconciles the same way.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `AgentOrgContainer` (reshaped `AgentOrgRun`) | The container file, units map, former units, Org rules, unit lifecycle (create/stop/retire), address resolution across units, view composition, Org follow |
| Org planner (pure, new, `agent-org-execution/membership/`) | Diff of the Org definition against the container (units added/removed/swapped; Org rules filtered to current units and members, like autobyteus-22 N-3) |
| Team and standalone agent roots | Their runs as today, plus the fixed `containedIn` and the step-2 port to their container |
| `MemberCollaborationContext.outgoingHandoffs()` (autobyteus-22) | A unit agent's rules = its run's rules + the container's Org rules from its Org address |
| `OrgViewSession` | One Org stream from the container's composition |
| Migration | Conversion of stored Org runs |
| Peer channel | FU-003 notice and reconcile |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| Member hosting inside `AgentOrgRun` (configured-agent handles, flat Team execution inside the Org root, `agent-org-execution-scope-builder.ts` member contexts) | Units are runs of their own | Team and agent roots |
| Org communication sidecar as message authority | Messages belong to the two runs (CM-9) | Units' logs; container composes the view |
| Org as delegating run for its members' delegations | Delegations come from the unit run | `delegatedFrom` naming the unit run |
| `TeamRunMembership`'s "Org-mounted, fixed" branch (autobyteus-22) | Org Teams are Team roots | Removed |
| Org task delegation records file | No current reader (only migrations read it) | Left in place as inert residue; nothing deletes history (contract §9, SR-012) |

## Exact Texts

- Notices and refusals: autobyteus-22 § Exact Texts, unchanged; an Org-level unit join/leave uses the same `Joined:`/`Left:` lines with the unit's name and Org address (a Team unit's line names the Team).

## Interface Boundary Mapping (key)

| Interface | Subject | Identity |
| --- | --- | --- |
| `containedIn: { orgRunId, address }` on Team tree and agent `run_metadata.json` | one unit run | fixed at creation |
| `OrgContainerPort` (narrow, passed to unit roots by the composition root): `placementAt(orgAddress)`, `orgRulesFrom(orgAddress)`, `deliver(intent)` | one container | Org run ID |
| `AgentOrgContainer.follow(view)` | one container | container |
| `PeerRunMembersNotice` (signed peer request) | one peer Team run | team run ID + link |
| `TaskExecutionResourcePort.updatePeerRunMembers(taskId, run, members, coordinator)` | one Task entry | Task ID + run |

## Existing Capability Reuse

Team roots, standalone agent roots, autobyteus-22 membership (planner, committer, notices, leaving), cross-run delivery (CM-9), delegation index and rows, `ChildRowsFeed`, peer client/gateway with signed requests, sealed migration runner and frozen layer: all reused.

## Change / Refactor Sequence (one ticket, ordered slices; each slice keeps the build green)

1. `containedIn` on Team and agent runs; container file shape; `AgentOrgContainer` creating unit runs (DS-001); Stop/reopen (DS-003).
2. Cross-run address resolution and delivery inside a container (DS-002); Org rules merged into unit rules; delegation origin = unit run.
3. Org view composition and command routing (DS-004); run-tree rows; history/memory readers (contained runs not top-level).
4. Remove the hosting machinery from the Org root (Removal Plan).
5. Migration with follow-ups and fixtures (DS-005).
6. Org follow (DS-006): Org rules on unit membership change; Org definition following.
7. FU-003 (DS-007).
8. Docs: collaboration model (CM-3, §3, §5 row), agent_orgs.md, agent_memory.md, glossary.

## Risks

- Event ordering in the composed Org view: units publish independently; the container's composition assigns one Org sequence on receipt (as the Team tab's subtree messages do, IF-11).
- Cross-run wake inside a container: a message to a stopped unit restores it (new rule; CM update) — bounded to units of the same container.
- Migration on large histories: renames, not copies; log split is one pass per Org log.

## Guidance For Implementation

- Follow the slice order; each slice with its tests.
- Migration tests per guideline §9 with hand-built fixtures of every released shape; never on real data or a copy.
- Real E2E per the requirements' Verification Intent.
- Keep files under 500 lines; new logic in owned files under `agent-org-execution/container/` and `agent-org-execution/membership/`.

## SR-006 Revision (after ARCH-REV-001: AR-001..AR-006; supersedes the conflicting lines above)

### R-1 Address rule (AR-001)

- A Team unit keeps **Org-space addresses**: its members are stored and addressed as today in the Org (`/software_engineering_team/code_reviewer`), its coordinator likewise, and its team-instance address is its Org address (`containedIn.address`, e.g. `/software_engineering_team`), not `/`. Prefixed member addresses in a Team tree are an existing supported shape (Team copies before autobyteus-461 stored them, IF-06).
- Resolution from a Team unit member: step 1 = its own Team instance (prefix `/software_engineering_team/`); step 2 = the container's units (every other Org address, through `OrgContainerPort.placementAt`). The two never overlap, so an Org agent `/solution_designer` and a Team member `/software_engineering_team/solution_designer` stay distinct exactly as today (MP-01). The short form `/code_reviewer` is not an address of anything in an Org (as today).
- `TeamExecutionIndex.teamInstancesOf` uses `containedIn.address` as the instance address of a contained Team run; the autobyteus-22 planner compiles a contained Team's own rules at its mount path (`containedIn.address`), the same compilation the Org compiler uses for a mounted Team (`resolveMountedTeamEndpoint`).
- `get_handoff_rules` of a unit agent: its run's rules (Org space) + the container's Org rules from its Org address (Org space): one address space.
- Example: Org `software-development-department` with a direct agent `/solution_designer` and Team `/software_engineering_team`. From `/software_engineering_team/code_reviewer`: `send_message_to('/software_engineering_team/solution_designer')` → step 1 → teammate; `send_message_to('/solution_designer')` → step 1 misses the prefix → step 2 → the Org agent's run.
- The migration therefore rebases nothing: members, coordinators, rules and log-line addresses keep their stored Org addresses (replaces migration step 2's rebasing).

### R-2 Delivery reuses `CrossRunMessageDelivery` (AR-003)

- A message from one unit run to another goes through `agent-collaboration/communication/cross-run-message-delivery.ts` (prepare → the receiver root accepts in its gate and writes its log, restored when admitted for restore → the sender's log commit; `counterpart`, closed-Task refusals unchanged).
- Its admission gains one rule: `same_container` — sender and receiver runs carry `containedIn` with the same `orgRunId` — evaluated before the Task rule. A `same_container` receiver that is not live is restored, whether it was never restored after an Org reopen, idle-shut-down, or stopped by the user on its own (DEC-006, the user 2026-11-22: a message wakes it).
- `OrgContainerPort` answers only `placementAt(orgAddress) → { runRef, agentRunId, memberAddress }`, `sameContainer(runA, runB)`, `orgRulesFrom(orgAddress)`. It delivers nothing. `deliverFromContainedUnit` is dropped.
- A unit root gets its port from the composition root's container directory by `containedIn.orgRunId` when it is created or restored, including a single Team unit restored by the Team manager (ARCH-REV-001 note).

### R-3 Org view composition: bounded local spine (AR-002)

Owner: `OrgViewComposition` (one per live container; `agent-org-execution/container/org-view-composition.ts`), with the container's own `RunViewStream` (Org identity) as the one sequenced stream the Org view reads.

- Relay: while the container is live it subscribes to each **live** unit root's view events and republishes each into the Org stream (projected into today's Org frame shapes; the stream assigns the Org sequence). A message between two units is relayed once: only the **receiver** unit's publication is relayed (the sender's is dropped when the receiver is a unit of the same container); a message to or from outside the Org is relayed from the unit that has it.
- Snapshot: the Org view session opens the container stream's snapshot connection. The snapshot is built inside the composition's gate, which pauses the relay: for each unit, a live unit's current own snapshot, a not-restored or stopped unit's stored package snapshot; composed into today's `TEAM`/Org execution snapshot shape (Org addresses, every member's status). The base is the container stream's sequence at that moment; every relayed frame after it is newer, so nothing is lost or doubled.
- In-band Org snapshot triggers: a unit root registered/unregistered (restored, stopped, idle-shut-down), a unit joining or leaving (DS-006), a contained Team's `team_membership_changed`. The composition publishes `org_composition_changed`; the Org view session re-opens the snapshot connection (in-band snapshot; the web already accepts one after the first, SR-046).
- Commands from the Org view: `SEND_MESSAGE` to a member of a not-restored unit → the container restores the unit root, the composition switches to it and the in-band snapshot is sent **before** the message is posted (the `whileRestoring` order, SR-048); to a unit stopped by the user → the same: restored, then the message posted (DEC-006). `INTERRUPT_GENERATION`, `APPROVE_TOOL`, `DENY_TOOL` are active-only: a not-live unit answers `RUN_NOT_ACTIVE` (as today).
- Reconnect: a reconnecting client gets a new snapshot of the container stream at a new base (as for any view).
- A stored (not live) Org: the stored-mode snapshot composes the units' stored snapshots; no relay (as today's stored mode).
- Example: open the Org (snapshot base 40: all units stored/Offline) → the user sends to `/software_engineering_team/solution_designer` → container restores the Team unit → composition subscribes to it → `org_composition_changed` → in-band snapshot base 41 (Team live, member Offline) → message posted → the member's events relayed as 42, 43, …

### R-4 Migration input map completed (AR-005)

- (a) Context files: the migration moves draft and final context files with their member folders (they live in the member's folder, resolved through the Org tree today) and rewrites saved attachment owner references in the converted members' traces from the Org owner `{ orgRunId, agentRunId }` to the unit's owner (`{ teamRunId, agentRunId }` for a Team member, `{ runId }` for a direct agent), with a frozen copy of the typed JSON/JSONL visitor of `agent-org-flat-team-families-v1` (preserving unrelated values, lines and bytes; strict source/target proof before writes). After the change, new Org conversations use the unit routes (`/team-runs/:teamRunId/agent-runs/:agentRunId/context-files/…`, `/runs/:runId/context-files/…`); the Org context-file routes and the Org member owner kind are removed (no Org-hosted member remains).
- (b) Log lines with a `counterpart` or any party outside the Org (autobyteus-565): the line goes to the Org member's unit log only, every field mapped from the whole released line (autobyteus-508 lesson); a fixture carries such lines (another run, another node, a user message, an intra-Team line, a cross-unit line).
- (c) Reader rule (§4): candidate readers and writers among earlier migrations, to be confirmed against code in implementation (registry test fails on an unclassified one): `agent-org-flat-team-families-v1` (reads/writes Org trees, locators), `agent-org-history-first-message-summary-v1` (reads Org logs/trees), `delegated-runs-own-runs-v1` and `collaborators-to-delegated-runs-v1`, `delegated-copy-own-file-complete-v1` (Task entries, delegated runs naming Orgs), `delegated-run-own-attachment-links` (attachment links), `migrate-native-working-context-snapshots-v5` and `remove-external-runtime-working-context-snapshots` (walk member folders by path), `run-history-index-v2`, `team-run-history-index-v2` (possible rebuilders). An Org run is left untouched (disposition `waiting_for_<migrationId>`) while any reader predecessor is not terminal; one parameterized follow-up per writer/reader (prerequisites: that predecessor and this migration; `requiredOnStartup`; idempotent by structure) converts it afterwards (reference: autobyteus-461 SR-078/079).

### R-5 Inventory of Org-specific code and run-folder walkers (AR-006)

Rule: H = the Org hosted its units' execution, log, attachments or delegations → moves to the unit run or is removed; C = lists, shows, launches, stops or composes the Org → stays on the container; W = walks run folders → contained runs handled as stated; D = definition side, unchanged.

| Files (under `autobyteus-server-ts/src/`) | Kind | Disposition |
| --- | --- | --- |
| `agent-org-execution/domain/agent-org-run.ts`, `services/agent-org-run-manager.ts`, `agent-org-run-service.ts`, `agent-org-run-planner.ts` | C (+H removed) | Become the container root, manager and planner; member hosting removed |
| `agent-org-execution/services/agent-org-execution-scope-builder.ts`, `agent-org-execution-index.ts`, `agent-org-execution-tree-location-service.ts`, `agent-org-run-execution-tree-mutator.ts`, `agent-org-run-persistence-coordinator.ts`, `agent-org-run-message-delivery.ts`, `agent-org-communication-port.ts`, `persistence/agent-org-communication-messages*.ts`, `agent-org-task-execution-adapter.ts`, `agent-org-task-event-retirement.ts`, `agent-org-run-delegated-launches.ts`, `agent-org-state-package-*` | H | Removed or reduced to the container file's own store and validator |
| `agent-org-execution/domain/agent-org-run-execution-tree.ts`, `run-history/store/agent-org-run-execution-tree-schema.ts` | C | Container file shape (`units`, `formerUnits`, Org rules, launch) |
| `agent-collaboration/delegation/collaboration-tree.ts`, `delegation-index.ts`, `run-tree-view.ts`, `run-history/store/run-own-agents-reader.ts`, `api/graphql/types/run-tree.ts` | C | Org rows from the container's units; a unit's own rows from its run (Team members via `teamMemberRowsOf`) |
| `agent-collaboration/execution/domain/member-instance-scope.ts`, `root-execution-identity.ts`, `services/collaboration-execution-location-service.ts`, `compositions/collaboration-root-resolver.ts`, `compositions/collaboration-composition.ts` | H→unit / C | Member scope and location resolve to unit runs; the resolver knows containers; composition wires the container directory and ports |
| `agent-collaboration/execution/run-status-service.ts`, `agent-collaboration/running/running-agents-listing.ts` | C | Statuses by unit run IDs; the Org row's status composed from its units; `list_running_agents` shows the same entries as today (the Org's members, each now with its unit run) |
| `services/agent-streaming/org-view-session.ts`, `agent-org-stream-handler.ts`, `agent-org-execution-view-projector.ts`, `collaboration-execution-tree-dto-projection.ts`, `websocket-egress/root-execution-event-sequenced-shape.ts` | C | Org view through `OrgViewComposition` (R-3); web contract unchanged |
| `run-history/services/agent-org-run-history-catalog-service.ts`, `agent-org-run-package-catalog.ts`, `agent-org-member-run-view-projection-service.ts`, `collaboration-root-history-service.ts`, `collaboration-run-history-catalog-core.ts`, `run-collaborator-port.ts`, `run-last-activity-reader.ts`, `run-records-source.ts`, `root-run-package-readiness-index.ts`, `run-history/maintenance/collaboration-run-history-index-repair.ts`, `api/graphql/types/collaboration-root-history.ts` | C | The Org history entry stays; its members' views, last activity and records read from the unit runs |
| `run-history/services/team-run-history-catalog-service.ts` (`:290`), the standalone agent run history lists | W | Contained runs are excluded from the top-level Team and agent run lists (they appear under their Org) |
| `run-history/services/root-run-package-current-validator.ts` | W | Validates a contained run as an ordinary run; the container validates both ends of each unit reference (§6) |
| `agent-memory/services/run-folder-discovery.ts` (memory search, episodic catalog, memory explorer), `agent-memory/services/agent-episodes.ts`, `agent-episodic-catalog/services/episodic-catalog.ts`, `agent-memory/store/agent-memory-layout.ts` | W | Contained runs are found at their standard places and attributed to their Org owner by `containedIn` (Memory page by owner shows the Org with its units, as today); the layout drops the Org member paths |
| `memory-sync/source/local-memory-export-scanner.ts` | W | Contained runs are excluded from memory sync (preserved: Org memory is not synced today, AF-09); syncing them is FU-001 |
| `context-files/domain/context-file-owner-types.ts`, `services/context-file-owner-resolver.ts`, `api/rest/context-files.ts` (Org routes) | H | Org member owner kind and routes removed after the migration (R-4 a) |
| `projects/domain/models.ts`, `projects/stores/task-execution-resource-schema.ts`, `projects/changes/project-change-messages.ts`, `run-history/store/delegated-from-schema.ts`, `agent-run-metadata-types.ts` | H→unit | New delegations from Org members name the unit run; `delegatingRun.kind = "agent_org"` stays readable only where the migration preserved an old entry without a delegator (preserved history) |
| `remote-collaboration/inbound/closed-delegations.ts`, `remote-message-receiver.ts`, `remote-run-view-provider.ts`, `compositions/remote-collaboration-composition.ts` | H→unit | A peer's run delegated from an Org member links to the unit run; FU-003's notice handled here |
| `token-usage/providers/token-usage-display-field-capturer.ts` | C | Org display fields from the container; usage recorded on unit runs |
| `agent-org-definition/*`, `agent-package-definitions/*`, `agent-packages/services/package-edit-capture.ts`, `agent-team-definition/services/agent-team-definition-service.ts`, `collaboration-definition-admission/*`, `api/graphql/types/agent-org-definition.ts`, `definition-problems.ts` | D | Unchanged (Org definitions) |

### R-6 Notes

- One net notice when Team and Org rules change for one agent from one event: the container's Org-rule changes queue into the same `TeamChangeNoticeSource` net-merge.
- FU-003's new peer request type: an older peer refuses it (DESIGN.md rule 9); the release notes say so.

## SR-008 Revision (after ARCH-REV-002: AR-001 narrowed, AR-002 narrowed, AR-007 new, N-1, N-2; supersedes R-1, R-3's snapshot paragraph and R-4 (a))

### R-1' Address rule, realized at one boundary (AR-001, option (i))

- A contained Team run's tree stays in **team space**, the current Team tree contract (`team-run-execution-tree-schema.ts:47,54-55`: members are direct children of `/`). IF-06's "prefixed member addresses are a supported shape" is stale (corrected by autobyteus-22 SR-008 N-7) and is withdrawn here.
- The contained Team root owns one translator, `ContainedTeamAddressSpace` (`agent-team-execution/container/contained-team-address-space.ts`), built from `containedIn.address` (prefix `P`, e.g. `/software_engineering_team`): `toOrg('/x') = P + '/x'`, `fromOrg(P + '/x') = '/x'`, `fromOrg(other) = null`. It is applied at exactly these points of a contained Team root, and nowhere else:
  1. Recipient resolution (`message-recipient-resolution.ts`): for a contained Team, step 1 matches only addresses under `P/`, strips `P` and resolves in team space; every other address goes to step 2 (the container's `placementAt`). A bare `/x` from a member is therefore not a teammate (as in an Org today) and step 2 answers not found unless the Org has a unit at `/x`.
  2. Presentation to the agent: `get_handoff_rules` and the Handoffs prompt section present the Team's own rules with `toOrg` (Org rules from the container are already Org space); autobyteus-22 notice texts present `Joined`/`Left` addresses with `toOrg`; refusals name `toOrg` addresses.
  3. The Team's outgoing cross-run messages: the sender address given to `CrossRunMessageDelivery` is `toOrg(member)`; incoming ones address the member by `fromOrg`.
  4. The Org view composition (R-3'') projects the contained Team's members, statuses and messages with `toOrg`; the Org rows (`run-tree-view.ts` Org path) name them with `toOrg`.
- Untouched: the Team tree schema and config builder, `TeamExecutionIndex` (instance `/`), autobyteus-22's planner, committer and stored texts (they work in team space; only presentation translates), the Team's own view, web selectors.
- Example (unchanged behavior): Org agent `/solution_designer`, Team `/software_engineering_team`. From `/software_engineering_team/code_reviewer` (stored `/code_reviewer`): `send_message_to('/software_engineering_team/solution_designer')` → step 1 (prefix) → `/solution_designer` in team space → teammate; `send_message_to('/solution_designer')` → not under `P/` → step 2 → the Org agent's run.
- Migration step 2 (replaces the SR-006 wording): the Team tree is written in team space: members, coordinator and the Team's own rules have `P` stripped (the Org compiler's mounted-Team endpoints, `collaboration-handoff-compiler.ts:57-64`, are the inverse). Log lines are written in the shape the current code writes for the same message: a line between two members of the Team in team space in the Team log; a cross-unit line in each run's log with that run's own member in its own space and the other party as the current cross-run writer records it (Org address, `counterpart`); lines with an outside party per R-4 (b).

### R-3'' Snapshot without loss or doubling (AR-002)

- The composition takes, for each live unit, a **per-unit `openViewSnapshotConnection`** (the unit's snapshot and its events after that unit's base, delivered by the connection itself, atomically), and composes the Org snapshot from those unit snapshots; stored or not-restored units contribute their stored snapshots.
- It relays, per unit, only the events its connection delivers after that unit's base, in arrival order, into the container's stream after the Org snapshot is published (events arriving while the Org snapshot is composed are queued per connection, not dropped and not re-read). The Org base is the container stream's sequence when the Org snapshot is published.
- An in-band Org snapshot closes and re-opens the per-unit connections.
- Test: a unit publishing continuously while the Org view opens and re-snapshots: every unit event appears exactly once, after the base.

### R-7 The web's Org routes stay, as thin edges through the container (AR-007; R-4 (a) revised)

Decision (a) for all three routes; the web stays unchanged (DEC-004 holds):

| Route (web builder) | Server today | After |
| --- | --- | --- |
| `/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/…`, `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/…` (`contextAttachmentModel.ts:12-13`) | Owner `{orgRunId, agentRunId}` proved by the Org tree, files in the member's folder | Same routes and owner form; `context-file-owner-resolver.ts` proves ownership through the container (`agentRunId` is a member of one of the Org's units) and resolves the unit run's folder |
| `/agent-org-runs/:orgRunId/communication/messages/:messageId/references/:referenceId/content` (`agentOrgExecutionContext.ts:324` → `api/rest/agent-org-references.ts:37`) | Read from the Org log | Same route; the container asks its units' reference content (each unit's existing log reader) for the message ID, bounded by the unit count |
| `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content` (`runFileChangeContentPath.ts:18` → `api/rest/run-file-changes.ts:99`) | Org membership resolves the member | Same route; the container resolves `agentRunId` to its unit run and delegates to that run's file-change entry (Team member or agent) |

- R-4 (a) becomes: draft and final context files **move with their folders**; saved references keep the Org owner form `{orgRunId, agentRunId}`, which stays the Org view's current owner contract, resolved through the container. **No trace rewriting**: the frozen visitor is dropped. New attachments made from the Org view use the same Org owner form (the web builds it), stored in the unit run's folder.
- R-5 rows updated: `context-files/*`, `api/rest/context-files.ts` (Org routes), `api/rest/agent-org-references.ts`, `agent-org-execution/services/agent-org-reference-content-service.ts`, `api/rest/run-file-changes.ts` (Org route), `run-history/services/agent-org-member-run-view-projection-service.ts` — kind C (container edge), not H-removed.

### N-1, N-2

- N-1: "same container" is one fact, answered by the container directory (`sameContainer(runA, runB)` from `containedIn`); the `same_container` admission calls it; nothing else derives it.
- N-2: the Org Stop fan-out (DS-003, stop every unit root) stays separate from a unit's interrupt (`RUN_NOT_ACTIVE` when not live).

## SR-009 Revision (after ARCH-REV-003: AR-001 narrowed; supersedes R-1' item list "exactly these four points … nowhere else")

### R-1'' One tool-facing address boundary for a contained Team root

`ContainedTeamAddressSpace` (prefix `P` = `containedIn.address`) is the contained Team root's **one tool-facing address boundary**: every address an agent of that Team gives is normalized on the way in, and every address it is shown is translated on the way out. Inside the boundary everything stays in team space (Team tree, index, autobyteus-22 planner, committer, stored texts, logs of intra-Team messages).

- In (`fromOrgInput`): an address under `P/` → team space (`P/x` → `/x`); `P` itself → **the agent's own Team** (team instance `/`), so the existing own-Team checks refuse it where they refuse own-Team targets today (CM-1); any other address → Org space, answered by the container (step 2 / in-run placement through `OrgContainerPort.placementAt`). A bare `/x` is Org space (as in an Org today).
- Out (`toOrg`): `/x` → `P/x`; the own Team instance `/` → `P`; Org-space addresses unchanged.

Surfaces (each named, each with tests):

| Surface | Code (base `9f6add773b`) | In / Out |
| --- | --- | --- |
| `send_message_to(recipient_address)` | `message-recipient-resolution.ts` `resolveMessageRecipient` (step 1 / step 2) | In |
| `send_message_to` result `agentAddress` | `root-communication-engine.ts:370` | Out |
| `delegate_task(recipient_address)`: self check, own-Team check, in-run placement | `catalog-delegation.ts:104-111` (`agentAddressOf`, `isOwnTeamAddress`), `team-execution-index.ts:147-153`, `team-recipient-resolver.ts` `resolveInRunDelegationPlacement` | In (normalized before the self and own-Team checks, so `delegate_task('P')` and `delegate_task('P/teammate')` are refused as own Team, MP-05) |
| Received-message sender address (header) | `reachingAddressOf` (`message-recipient-resolution.ts:96-115`) → `inter-agent-message-runtime-builders.ts:33` | Out: a teammate's stored `/code_reviewer` is shown as `P/code_reviewer` (resolved in team space first, then translated), MP-06; an Org-unit sender keeps its Org address |
| Cross-run sender/receiver addresses | `CrossRunMessageDelivery` inputs | Out (sender) / In (receiver) |
| `get_handoff_rules`, Handoffs prompt section | `get-handoff-rules-service.ts`, `collaboration-prompt-sections.ts` | Out (Team rules; Org rules already Org space) |
| autobyteus-22 notices and refusals | `team-change-notice-source.ts`, former-member refusal | Out |
| Mentions (`@`) from the Org view | `RootTeamRun.resolveCollaboratorMentions` (`root-team-run.ts:261`) | In |
| `list_available_agents` addresses | `collaborator-candidate-policy.ts:47-59` (`address`) | Out |
| Org view and Org rows | R-3'', `run-tree-view.ts` Org path | Out |

Example (extends R-1'): from `/software_engineering_team/code_reviewer` (stored `/code_reviewer`), `P = /software_engineering_team`:
- `send_message_to('/software_engineering_team/solution_designer')` → `/solution_designer` in team space → teammate; the result's `agentAddress` is shown as `/software_engineering_team/solution_designer`.
- `send_message_to('/solution_designer')` → Org space → the Org agent's run.
- `delegate_task('/software_engineering_team')` → own Team → refused by CM-1, as today; `delegate_task('/software_engineering_team/architecture_reviewer')` → teammate → refused by CM-1, as today; `delegate_task('/product_design_prototyping_team')` → Org space → in-run placement of the other unit → allowed, as today.
- A message from the teammate `/solution_designer` shows its sender as `/software_engineering_team/solution_designer`, as today.

Tests: MP-05 (`delegate_task` to `P` and to `P/teammate` refused), MP-06 (received teammate header shows `P/x`), each surface above in and out.

## SR-010 Revision (after ARCH-REV-004: AR-001's mapping of `P`; supersedes R-1'''s "`P` itself → the agent's own Team (team instance `/`)" and the two `delegate_task('/software_engineering_team…')` example lines)

### R-1''' The Team's own Org address `P`, per surface, as today

`P` is never mapped to the root `/` (the root is not a collaboration recipient, `team-recipient-resolver.ts:42-46`). The boundary gives it the meaning it has today in an Org:

| Surface | `P` today (in the Org root) | After (contained Team root) |
| --- | --- | --- |
| `send_message_to('P')` | Step 1 includes the instance address (`message-recipient-resolution.ts:51-52`) → `memberOfInstance` → the Team's coordinator (`team-execution-index.ts:161-169`) | The boundary maps `P` to the coordinator's team-space address before resolution → the coordinator; the result's `agentAddress` is shown as `P` (the address the sender used, as today) |
| `delegate_task('P')` | Own Team → `ownTeamDelegationRefusedMessage(P)` (`collaborator-errors.ts:81-82`, CM-1) | The boundary recognizes `P` (and any `P/x`) as own Team **before** `requireNonRootAddress` and refuses with `ownTeamDelegationRefusedMessage` naming the address the agent gave |
| Mentions (`@`) | Input is a definition; the own Team mention answers its instance address with relation `own_team` (`collaborator-admission.ts` `ownTeamMention`) | Same; its address is shown as `P` (out) |
| `list_available_agents` | Own Team entry at its instance address (when listed) | Shown as `P` (out) |
| Received header / `reachingAddressOf` | A sender is named by its member address | Unchanged by `P` (a sender is a member, `P/x`) |

Example (replaces the two `delegate_task` lines of R-1''; from `/software_engineering_team/code_reviewer`, stored `/code_reviewer`, `P = /software_engineering_team`):
- `send_message_to('/software_engineering_team')` → the Team's coordinator (as today); result `agentAddress` `/software_engineering_team`.
- `delegate_task('/software_engineering_team')` → refused: "/software_engineering_team is in your own team; you can't delegate to it. Talk with it using send_message_to." (as today).
- `delegate_task('/software_engineering_team/architecture_reviewer')` → refused with the same text naming that address (as today).
- `delegate_task('/product_design_prototyping_team')` → another unit → allowed (as today).

Tests: `send_message_to(P)` reaches the coordinator; `delegate_task(P)` and `delegate_task(P/x)` give the exact CM-1 text; the own Team mention and `list_available_agents` entry show `P`.

## SR-013 Revision (after CRR-001 CR-001: step 2 of runs delegated by an Org unit)

### R-8 A run delegated by an Org unit reaches the Org by Org addresses, as today

Today a run an Org member delegated has the Org run as its step-2 assigner, whose standing is every Org member and mounted
Team at its Org address (`agent_orgs.md:222-225`, contract §2.3 step 2; base test `collaboration-tree-reach.test.ts`
B-4). After the restructuring the assigner is the member's unit run (contract §6), whose own standing is only its own
agents (a Team unit's in team space). Rule:

- **Reach.** In `CollaborationTree.stepTwo` (`collaboration-tree.ts:175-194`), an assigner that is a unit run (its own
  file has `containedIn`) contributes **its container's placements at Org addresses** — the same set `containerStepTwo()`
  gives the units themselves: every unit's agents at their Org addresses (a Team unit's members as `P/x`), each Team unit's
  address answered by its coordinator, every agent unit at its address — instead of `standingOf(unit run)`. A Team unit's
  team-space standing is never exposed. Order is unchanged: assigners in their order, the first assigner with an address
  wins it; a contained assigner's container set is one assigner's contribution, rank `configured`.
- **Delivery.** A message from such a delegated run to an agent of one of the container's units is admitted by the
  same-container rule extended to delegation: `same_container` holds when both runs are units of one container, **or**
  when the sender's delegation chain (`DelegationIndex.chainOf`, assigners upward) contains a unit run of the receiver's
  container. So a stopped receiver is woken (DEC-006), as today where every member was part of the assigner run. One fact,
  answered by the container directory (`sameContainer`, N-1), now taking the sender's chain into account.
- **Converted delegations** keep the reach: the migration rewrites their `delegatedFrom` to unit runs (contract §6), and
  the rule above gives them the same Org reach.
- **Unchanged:** a delegated run's own members still reach each other in its own space (step 1); a run delegated by a
  run outside any Org is unaffected.

Example: Team unit member `/software_engineering_team/solution_designer` delegates a Task to a copy of
`/product_design_prototyping_team` (another unit, allowed by R-1'''). The copy's members:
`send_message_to('/software_engineering_team/solution_designer')` → step 2, contained assigner → the Team unit member
(Org address) → admitted `same_container` through the chain → delivered, woken if stopped. `send_message_to('/concierge')`
→ the agent unit, likewise. Before this rule both were `COLLABORATION_TARGET_NOT_FOUND`.

Docs: `agent_orgs.md` § Addresses And Handoffs (the "a delegated team run … reaches the org's standing agents" paragraph)
is rewritten for unit runs as assigners; `collaboration_model.md` §2.3 step 2 notes the container rule.

Tests (entering through `send_message_to`, not the resolver directly): from a run delegated by an agent unit, and from a
run delegated by a Team unit member, reaching (a) an agent unit by Org address, (b) a Team unit member by `P/x`, (c) a
Team unit by `P` (its coordinator); each also with the receiver unit stopped (woken). Base B-4 updated to the container
rule. A converted delegation (fixture) reaches the Org the same way.
