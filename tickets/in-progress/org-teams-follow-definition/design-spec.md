# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements: `requirements-doc.md` at SR-004 (REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-005), approved by the User on 2026-11-21 (quotes in the requirements' Document Status); direction SR-002 (Org as a container of runs).
- Behavior-defining supplements: autobyteus-22's approved behavior and texts (archived `tickets/done/team-run-follows-definition/`), reused unchanged.
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
- Deliberately left alone: the web Org workspace (it keeps its one Org stream), Org definitions and their editor, Team runs outside Orgs, standalone agent runs outside Orgs, placement copies, application-bound Orgs (they convert like others; their binding stays on the container and is passed to units as today's `applicationExecutionContext`).
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
  2. Each mounted Team: rename `agent_orgs/<org>/<teamRunId>/` → `agent_teams/<teamRunId>/` (rename, not copy: `team-agent-memory-layout` lesson); write `team_run_execution_tree.json` from the Team node: members and coordinator rebased to the Team's own space (`/software_engineering_team/x` → `/x`, as autobyteus-461 rebased delegated Teams), the Team's own rules (Org handoffs whose `from` and `to` are both inside the Team, rebased), launch (Team node's), `containedIn: { orgRunId, address }`.
  3. Each direct agent: rename `agent_orgs/<org>/<agentRunId>/` → `agents/<agentRunId>/`; write its `run_metadata.json` (identity, definition, launch from the node, workspace) with `containedIn`.
  4. Split the message log: a line between two members of one Team → that Team run's log; a line between two units (or a user line to a unit) → both runs' logs (receiver first, one message ID, CM-9); lines keep their IDs and times; sender/receiver addresses rewritten to each run's space; the Org log is kept as inert residue only after all target logs validate (§6 Residue), then removed in the same migration (the container has no log).
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
| Org task delegation records file | Task entries of unit runs | Converted, then removed |

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
