# Memory Layout Contract — A Task Agent Is A Normal Run

Status: **revision 5** (2026-10-17): revision 4 (passed architecture review ARCH-REV-003) plus the implementer's own-file clarifications U-1..U-5 (§3.1–§3.3, §6) and the naming rule (§3.5; the user, 2026-10-17). Base `origin/personal` `66429d6f31`. Revision 2 was read and approved by the user.
It governs `design-spec.md` (SR-005); nothing is built until the user and the architecture review
accept both. Base `origin/personal` `8a970f214c`. Task 8641c0ac.

Revision 2 — confirmed by the user (2026-10-17) after comparing it with a middle path (facts kept
in the coordinating tree): the coordinating run behaves like a hub, and authority by ownership is
right; it is also the shape needed to delegate to a task agent on another node later.

Revision 2 (the user's direction, 2026-10-17): a task agent owns its own facts like any run —
its own `run_metadata.json` (agent) or its own team tree (task agent team), each with a
`taskAgent` section — and the coordinating run keeps only links. Revision 1's separate
`task_agent.json` back-link is withdrawn.

Authorities: [Collaboration Model](../../../autobyteus-server-ts/docs/design/collaboration_model.md)
CM-5, CM-7, CM-8 ("A run owns its own content; the coordinator owns the relationship"), CM-9;
[Data Migration Guideline](../../../autobyteus-server-ts/docs/design/data_migration_guideline.md);
`requirements-doc.md` (SR-005, which names this contract as its behavior-defining supplement); TESTING.md (migration tests on
small synthesized data covering every shape).

Words: a **task agent** (or **task agent team**) is the run a `delegate_task` creates; the
**delegating agent** is the agent that called it; the **coordinating run** is the run that records
and coordinates it (today the topmost run of the chain, CM-7). Every run has a **run id**.

## 0. The main scenario: a long-lived hub

The user's main way of working (90–95% of the time): one Project Task Manager run (a standalone
agent) is kept for months, possibly a year or longer, possibly by a whole company, and delegates
Tasks to teams (mostly the software engineering team), sometimes giving a follow-up Task to the
same task agent team. On the user's machine today: 62 of 88 task agents belong to standalone runs,
and one Project Task Manager run holds ≈265 MB of task agents' memory.

What the layout must therefore keep true over time:

- **H1 The hub stays small.** The coordinating run's tree holds only links; after the upgrade its
  log receives only messages to and from its own parts (the messages it already had stay, §7); its
  folder holds only its own memory. Growth goes into the task agents' own folders.
- **H2 Restoring the hub does not restore every task agent.** Reopening the hub reads its tree (the
  links) and each task agent's small own file (to build today's in-memory records, §11) and starts
  every task agent shut down and wakeable; a task agent's runtime is built only when it is woken. **Known cost (V-17):** the views the app shows today when a hub
  is opened — the hub's task tree with every task agent team's members and status
  (`agentRunCollaboration`), and the team / org run list, which sends each run's whole tree — need
  every task agent's own record, so composing them reads one small file per task agent instead of
  one large tree (about the same bytes, more file reads). Reading task agents only when the user
  expands them needs a change in the app (a follow-up, not this ticket; possibly together with the
  slow-opening Task e6985045).
- **H3 One delegation writes one new task agent's files and one short link**, never a rewrite of
  every task agent's facts.
- **H4 Ready for another node.** A task agent's folder holds everything it is (its facts, memory and
  log), and the hub relates to it only by its link — the shape needed when a task agent later runs
  on another node (collaboration model §4).

## 1. Principles

- **P1 A task agent is a normal run.** It has the same folder, the same files and the same facts
  as any run of its kind: an agent at `memory/agents/<run id>/` with `run_metadata.json`; an agent
  team at `memory/agent_teams/<run id>/` with `team_run_execution_tree.json`,
  `team_communication_messages.json` and its members inside. One extra `taskAgent` section says
  that it is a task agent and which run coordinates it.
- **P2 The task agent owns its facts; the coordinating run owns the relationship.** The task
  agent's own files are the only place for every fact that can change (definition, runtime, model,
  model settings, Settings edits, workspace, platform session id; for a team: members, coordinator,
  handoffs, default launch settings). The coordinating run's tree keeps only the link. The few facts
  about the relationship that never change — its address, the delegating agent, when it started —
  are recorded on both sides, like an email's sender and recipient in both mailboxes, so each side
  can describe the relationship without the other (H4). No changing fact is stored twice.
- **P3 The coordinating run coordinates.** It knows its task agents (links), runs their
  lifecycle (hosting, idle shutdown, wake on message, stop on Task closure), routes their
  messages, and keeps its own log. It does not store their content.
- **P4 A task agent is never mistaken for a run the user started.** The one reader of each kind of
  run file decides: a standalone run is run metadata *without* a `taskAgent` section; a team run
  is a team tree *without* one. Every existing caller keeps seeing exactly what it sees today; only
  callers that need a task agent's facts use the task-agent reader (§5 G1, G2).
- **P5 Each message is stored with the run(s) it belongs to (email model, CM-9).**
- **P6 Move, never copy; never lose; never lock out.** Existing data is moved once at startup by
  renaming folders; nothing is deleted; a task agent that cannot be moved is left intact and
  reported, and the app still starts.
- **P7 The user sees no difference.** Sidebar (run history), opening runs and task agents,
  Settings, Token Meter, Task pages, Memory page Teams / Orgs lists: unchanged. Only addition: the
  Memory page Agents list shows task agents under their agent definition (DEC-004).

## 2. The target layout

```text
memory/
  agents/
    research_assistant_7f3a/                 a standalone run (the user started it)
      run_metadata.json                        → no taskAgent section: a standalone run
      raw_traces_active.jsonl, file_changes.json, context_files/, …
      collaboration/
        collaboration_tree.json                → links to its task agents
        communication_messages.json            → its own message log
    web_researcher_5a1c/                     a task agent (coordinated by research_assistant_7f3a)
      run_metadata.json                        → its own facts + taskAgent section
      communication_messages.json              → its own message log
      raw_traces_active.jsonl, file_changes.json, context_files/, …
  agent_teams/
    my_team_ab12/                            a team run (the user started it)
      team_run_execution_tree.json             → no taskAgent section; links to its task agents
      team_communication_messages.json
      <member run id>/ …
    software_engineering_team_8f12/          a task agent team
      team_run_execution_tree.json             → its own members, coordinator, handoffs + taskAgent
      team_communication_messages.json         → its own message log
      solution_designer_4b7d/ …, code_reviewer_e211/ …
  agent_orgs/
    autobyteus_org_3aba/                     an organization run
      agent_org_run_execution_tree.json        → links to its task agents
      agent_org_communication_messages.json
      <direct agent run id>/ …, <mounted team run id>/<member run id>/ …
```

- **L1** A task agent's folder is `agents/<agentRunId>/`; a task agent team's folder is
  `agent_teams/<teamRunId>/` with its members at `agent_teams/<teamRunId>/<memberAgentRunId>/`. Teams
  are flat: a team's members are agents (current code holds no team inside a team since Task 9942a43c;
  the retired v1.4.53–v1.4.69 nested shape exists in no install — the user, 2026-10-17; 633 trees read,
  0 nested).
  This holds for every coordinating run kind, for a task agent created by a member of a mounted
  team, and for a task agent created by a task agent (nested).
- **L2** Run ids are globally unique (definition slug + UUID), so folders never collide (ASM-001);
  the migration still refuses to overwrite (§8).
- **L3** The coordinating run's folder keeps its own memory, its own parts (host / members / direct
  agents / mounted teams), its tree (with links) and its own message log — nothing of a task agent.

## 3. The records

### 3.1 A task agent's own `run_metadata.json`

The same fields as any agent run (`run-history/store/agent-run-metadata-types.ts`), plus `taskAgent`:

```json
{
  "runId": "web_researcher_5a1c",
  "agentDefinitionId": "web-researcher",
  "workspaceRootPath": "/Users/me/projects/x",
  "memoryDir": "/Users/me/.autobyteus/server-data/memory/agents/web_researcher_5a1c",
  "llmModelIdentifier": "claude-sonnet-…",
  "llmConfig": null,
  "autoExecuteTools": true,
  "runtimeKind": "claude_agent_sdk",
  "platformAgentRunId": "…",
  "startedAt": "2026-10-17T09:12:00.000Z",
  "taskAgent": {
    "coordinatingRun": { "kind": "agent", "runId": "research_assistant_7f3a" },
    "delegatorAgentRunId": "research_assistant_7f3a",
    "address": "/web_researcher"
  }
}
```

- `taskAgent.coordinatingRun` — **which run the task agent is part of**: the run that records its
  link, hosts it, shuts it down when quiet, wakes it and stops it when its Task closes. Always a
  whole run; `kind` is `"agent"`, `"agent_team"` or `"agent_org"`.
- `taskAgent.delegatorAgentRunId` — **which agent created it**: the agent that called
  `delegate_task`; the task agent reports to it (the sender run id of its task message). The two
  are the same only when a standalone agent delegates itself:

  | Who delegates | `coordinatingRun` | `delegatorAgentRunId` |
  | --- | --- | --- |
  | a standalone agent (e.g. the Project Task Manager) | `{kind:"agent", runId:<its run id>}` | its own run id (same) |
  | a member of a team run | `{kind:"agent_team", runId:<the team run's id>}` | the member's run id |
  | a direct agent of an organization | `{kind:"agent_org", runId:<the organization run's id>}` | that agent's run id |
  | a member of a task agent team (nested) | the topmost run of the chain (CM-7), e.g. the Project Task Manager's run | the member's run id |
- `taskAgent.address`: the address the delegation used (the task agent's place for its own
  addressing, as `memberAddress` today).
- `taskAgent.delegatorAgentRunId` is optional: records written before it existed have none (4 in
  the user's data).
- The record's launch provenance moves with it: `taskAgent.launchSource` (how the launch settings
  were resolved, when recorded) and `taskAgent.userLaunchSelection` (the user's Settings edit, when
  made). The top-level fields hold the launch the run **started** with (`llmModelIdentifier`,
  `llmConfig`, `runtimeKind`, `autoExecuteTools`, `workspaceRootPath`); the user's Settings edit stays
  only in `taskAgent.userLaunchSelection`, recorded beside the started values and never over them
  (DEC-005 / AR-005), and the effective launch is computed from both as today (U-1).
  `workspaceRootPath` may be `null` for a task agent (its launch can have no workspace; U-2).
- `taskAgent.origin`: `"catalog"` (started from a listed definition: the own file holds its
  definition and launch) or `"configured_place"` (started from a configured place of the
  coordinating run — a team member or organization agent at that address: its definition and
  launch stay the place's and follow later changes of that place, exactly as a record without
  `source` does today). For `"configured_place"` the top-level launch fields hold the values it
  started with when known (new delegations) and `null` when never recorded (migrated records);
  they are informative, and composing yields today's record without `source` (U-4).
- No `preparedAt` / `preparedExpiresAt` (a task agent is never a prepared standalone run), no
  `launchPurpose`, no `applicationExecutionContext`.
- No schema version field (Data Migration Guideline); unknown fields ignored by readers.

### 3.2 A task agent team's own `team_run_execution_tree.json`

Today's team tree shape (`rootTeam{teamRunId, teamDefinitionId, address, coordinatorAddress,
defaultLaunchConfiguration, members[…], taskExecutions: []}`, `handoffs`, `createdAt`, …) plus a top-level
`taskAgent` section of the same shape as §3.1, read only by the task-agent-team reader (G2 keeps the
standard readers away). Deviations from a team run's tree, so nothing is invented and nothing lost
(U-3): `rootTeam.teamDefinitionName` is omitted (not recorded today); each member is `{address,
agentDefinitionId, agentRunId, platformAgentRunId, role: null, description: null,
launchConfiguration?, launchSource?, userLaunchSelection?}` with the optional fields present only when
recorded today (an absent `launchConfiguration` means the member follows the team default);
`defaultLaunchConfiguration` is the team default; `taskAgent.launchSource` is the team's
`defaultLaunchSource` and `taskAgent.userLaunchSelection` the team's `userTeamLaunchSelection`. Its `rootTeam.taskExecutions` stays empty: task agents its members create are
coordinated (and linked) by the coordinating run (CM-7). Its members' memory is inside its folder
as in any team run.

### 3.3 The link in the coordinating run's tree

```text
agent task agent:  { address, agentRunId, delegatorAgentRunId, startedAt }
team task agent:   { address, teamRunId, delegatorAgentRunId, startedAt }
```

Places: a new link is always written at the coordinating run's top level — `agents.taskExecutions`
(agent runs), `rootTeam.taskExecutions` (team runs), `rootOrg.taskExecutions` (organization runs) —
because new task agents are always hosted by the coordinating run (collaboration model, CM-1).
Links of older task agents stay where their records already are, including
`rootOrg.members[].taskExecutions` (C6).

**L4 A record becomes a link only when its own file exists.** Whenever a tree is saved, a task agent
record whose own file exists is written as its link; any other record is written back unchanged.
It is the same check the store makes when it reads, and it guarantees that no save can erase a task
agent's facts before they are in its own file (the one data-integrity guard kept; DESIGN.md: "start
simple does not mean omit … data-integrity obligations"). What leaves the
link and moves to the task agent's own files: `source` (definition, launch configuration, team
members, coordinator, handoffs, default launch settings), `platformAgentRunId`, a team's
`members[]`. The Task a task agent works on stays where it is today (Projects
`agent_run_resources.json`).

### 3.4 Message logs

Entry: `{ messageId, senderAgentRunId, receiverAgentRunId, content, messageType, referenceFiles,
createdAt }`. Each run's log is its family's file (§2). A message between parts of one run is
stored once, in that run's log; a message between two runs is stored in both logs with the same
`messageId`. Parts of one run: the coordinating run's own host / members / direct agents /
mounted teams, or the members of one task agent team. A task agent is never a part of its
coordinating run.

**L5 Loading never fails because of one task agent.** When a coordinating run is loaded, a task
agent without a readable own file is left out (not available, L6, §10); the coordinating run and every
other run load normally. Neither the migration nor history may stop the app from starting or new
work from being created (the user, 2026-10-17; the lesson behind the Data Migration Guideline's
"never lock users out").

**L6 A save never removes what it did not load.** A task agent is *available* when its own file
exists. Only available task agents are loaded (composed into the coordinating run, restorable,
shown). A record without its own file (its migration not finished) is not loaded, not shown and not
restored — otherwise it would start with empty memory at L1 and block its own move — and every save
writes it back unchanged (L4). A stored view shows the messages whose endpoints are loaded; messages
with a task agent that is not available stay in the logs, unshown, until it is. Saves are computed
against the files, never by overwriting them with what was loaded: a tree save compares each loaded
task agent with its own file and writes only those that differ (H3), and writes back records it did
not load unchanged; a message save adds the new message to the logs it belongs to (a task agent's
own log only when the task agent is available) and never rewrites a log from what was loaded. So
no save can erase a record, a fact or a message it did not load, and a coordinating run never fails
to load because a stored message names a task agent that is not available (L5).

### 3.5 Names (the user, 2026-10-17)

Current code names carry no version numbers (DESIGN.md rule 8): this ticket renames the current
runtime files, types, functions and constants that do (§12.3a), without changing any file name or
value on disk. Migration ids and migration-owned frozen names stay as released; new frozen copies are
named after the migration that owns them (e.g. `released-trees-before-task-agent-own-run.ts`).

## 4. Operations

| Operation | Reads | Writes | Behavior |
| --- | --- | --- | --- |
| Delegate | the delegation target's definition | first the task agent's own files (§3.1 / §3.2) at L1, then the link (§3.3) in the coordinating tree | Same tool result, events and task message as today; nothing in the delegating agent's folder; a link always points to files that exist |
| Task agent works | its own files | its own folder | raw traces, file changes, context files as today |
| Idle shutdown, wake, Task close / reopen, reactivation | the link; the task agent's own files | the task agent's folder | Same lifecycle and rules (BEH-003); restore takes the launch settings and conversation from the task agent's own files |
| Reopen a stored coordinating run / server restart | its tree (links) | — | Every task agent starts shut down and wakeable unless its Task is closed (BEH-004); its runtime is built from its own files when it is woken (H2) |
| Show the hub's task tree / the team and org run list | links → each task agent's own record (metadata, a team's tree) | — | Same view as today (task agents, a team's members, status colors); composed from one small file per task agent (H2 known cost) |
| Open a task agent in the app (conversation, file changes, context files, Event Monitor, Token Meter, Task locator) | link → run id → own folder | — | Same content as today (BEH-005); found by run id |
| Settings: change a stopped task agent's model | its own files | its own `run_metadata.json` (or a member's `launchConfiguration` in the team's own tree) | Same rule as today ("only its stopped task agents' models can change") |
| Sidebar (run history) | history index; standalone metadata (G1) | — | Unchanged: task agents never appear as their own rows |
| Memory page — Agents list | `agents/*`; G1 / task-agent reader | — | A task agent is listed under its `agentDefinitionId`, never "Unattributed" (AC-013); a task agent whose coordinating run no longer links it is not listed |
| Memory page — Teams / Orgs lists | history rows | — | Unchanged |
| Startup readiness check | family folders; G1 / G2 | — | Task agent folders are not root candidates (no diagnostic); coordinating runs list their task agents' folders by L1 as owners (context files) |
| Stale prepared-run cleanup | standalone metadata (G1) | — | Unchanged; task agents skipped |
| Offline history-index repair | admitted team / org packages (G2) | — | Never projects a task agent team as a team row |
| Delete a coordinating run from history | — | removes only its own folder | Its task agents' folders are **kept** (the user, 2026-10-17: "if delete hub will delete all run data that will be really big loss"); they become *detached* (§10). The delete confirmation says that the task agents' memory is kept. Refused while active, as today |
| Memory Sync export | `agents/`, `agent_teams/` | — | Task agent folders exported like any run folder (now also those of organization runs, which used to sit inside `agent_orgs/`, not exported); moved data re-exports once (bounded residue on the receiving node, memory_sync.md precedent). On the receiving node, task agents coordinated by an organization run are not listed in imported memory, because `agent_orgs/` is not exported and their link cannot be checked (one line in `memory_sync.md`) |
| Send a message | coordinating run's index | the log(s) of §3.4 | Receiver's log first, then the sender's, under the coordinating run's existing persistence lock (DEC-011) |
| Communication view, attachments, references, stream events | coordinating run's log ∪ its available task agents' logs | — | Each message once (de-duplicated by `messageId`); only messages whose endpoints are loaded (L6) |
| Imported Memory Sync corpora (Memory page with an imported source) | `memory/imports/<node>/…` with the same Memory page code, read-only | — | Not migrated (DEC-007). A node's imported data shows its hubs' task agents once that node runs this release and syncs again; until then its old nested task agents are not shown (no reader for old layouts). The old nested copies left after a re-sync are inert residue. Release notes: update every node together. |

## 5. Consumers in the code

### 5.1 The two guards

- **G1 agent run metadata** (`run-history/store/agent-run-metadata-store.ts`): the existing reader
  returns a run's metadata only when it has no `taskAgent` section — so the ~20 files that read run
  metadata today (sidebar identity, provisioning `hasRunIdentity` / stale cleanup, lifecycle,
  history catalog, view / status projections, resume config, model-config commit, validator,
  explorer, skill improvement, token display, supervisor, …) keep treating a task agent as "not a
  standalone run", exactly as today. A separate task-agent reader returns metadata with the
  section, for the callers that need a task agent's own facts (§5.2).
- **G2 team tree admission** (`root-run-package-current-validator.ts`, team tree store / package
  catalog): a team tree with a `taskAgent` section is never admitted as a team run (so standard
  team APIs, history rows and the offline repair never see it); a task-agent team reader serves
  §5.2.

Precedent and why one place: `run_metadata.json` already marks a special kind of run
(`launchPurpose: "server_helper"`), but that is checked in only one rule
(`standalone-agent-run-eligibility.ts`). Putting the task-agent check into the readers themselves
means no caller can forget it.

### 5.2 What changes, and what keeps working unchanged

The tree stores keep today's in-memory records (design D-1): they build each record on load from the
link and the task agent's own file, and split it again on save (L4). So most consumers keep working
on the same types.

**Changes:**

| Owner | Change |
| --- | --- |
| the three tree stores: `standalone-root-package-store.ts`, team tree store, org tree store (+ `run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts` for the on-disk link) | compose on load, split on save (L4), write only changed own files (H3) |
| `run-history/store/agent-run-metadata-store.ts` (+ types) | G1; task-agent reader / writer |
| team tree store admission | G2; task-agent-team reader / writer |
| `agent-memory/store/agent-memory-layout.ts`, new placement module, `rooted-agent-memory-locator.ts` → placement-based locator; handles / adapters / location services that compute a memory directory | L1 via one placement rule (design D-2) |
| the three message stores and their persistence coordinators | per-run logs (§3.4), compose on load (design D-4) |
| `run-history/services/root-run-package-current-validator.ts` | task agent folders are not root candidates; owners by placement; detached folders are not reported (§10) |
| `agent-memory/services/agent-memory-explorer-service.ts` | task-agent reader → `agentDefinitionId` |
| web history delete confirmation | text: the task agents' memory is kept |
| the migration | §8 |

**Unchanged (they work on the composed in-memory records):** task execution adapters' planning and
restore, task source resolvers, `collaborator-source-projector.ts`, execution indexes, Settings launch
selection (`delegated-launch-selection.ts`, `team-run-delegated-launches.ts`,
`team-run-delegated-launch-plan.ts`, `agent-org-run-delegated-launches.ts`,
`delegated-launch-selection-command.ts`), member view projections, the views sent to the app
(`collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts`,
`task-execution-tree-projection.ts`), tree mutators, create paths (`catalog-delegation.ts`,
`collaborator-admission.ts`), `task-team-node-restoration.ts`, `delegated-stop-set.ts`, run delete
(own folder only).

### 5.3 Unchanged (verified)

Sidebar identity and history catalogs (rows from the history index); stale prepared-run cleanup;
team / org memory explorers (history rows); Memory Sync export scanner; standalone root manager and
tree path (the root's own `collaboration/` tree and log); `collaborator-root-port-resolver.ts`; the
offline history-index repair (behind G2). (Revision 2 listed `runtime-memory-location-classifier.ts`
here as "frozen"; it is not — it calls the current location services. See §5.4.)

### 5.4 Released migrations that still run on old data (ARCH-F-001)

A user upgrading from an earlier release still has earlier migrations pending; they run in this
release, before ours, on the old layout. They must behave exactly as released (Data Migration
Guideline §4: "Before changing a current schema, repoint any released migration that still imports
it"). Rule: **this ticket changes no code a released migration depends on for old data**; where a
released migration imports a module this ticket changes, it is repointed to a migration-owned frozen
copy of today's behavior, shared in `app-data-migrations/legacy/released-run-package-shapes/`.

| Released migration | Imports, changed here | Decision |
| --- | --- | --- |
| `20261015_collaborators_to_delegated_runs_v1` | writes and reads trees through the three current tree stores (D-1) | **Repoint**: validate with the frozen tree schemas of today (V3 records) and write with the atomic writer. Through the new stores its converted task records would be "new" and get own files at L1 before their memory moves, and ours would then skip them (S27) |
| `20260905_agent_org_history_first_message_summary_v1` and its evidence reader | reads org trees and org messages through the current stores (D-1, D-4) | **Repoint** the reads to the frozen tree parser and a direct read of the message file (message entry shape unchanged here); the in-memory index and package validator stay current (types unchanged, D-1) |
| `20260901_agent_org_flat_team_families_v1` | the org message store (D-4) | **Repoint** reads to a direct read of the file |
| `team-run-migration-state-classifier` (used by team tree migrations) | `TeamCommunicationV1Store` (D-4) | **Repoint** to a direct read of the file |
| `20260926_team_context_file_execution_locators_v1` (+ its current-locator validator) | `RootRunPackageCurrentValidator` (D-6: owners by placement, composed reads) | **Repoint** to a frozen copy of today's validator: today's owner directories (task agents nested), direct reads with the frozen tree parser |
| `20260731_migrate_native_working_context_snapshots_v5`, `20260731_remove_external_runtime_working_context_snapshots` | `RuntimeMemoryLocationClassifier` → current location services (D-2) | **Repoint** to a frozen copy of today's classifier and location derivation (task agents nested) |
| migrations calling `AgentMemoryLayout` path methods, `RootExecutionPhysicalScope`, run-history index stores and catalogs, `AgentRunMetadataStore` | — | **Unaffected**: the layout's existing methods keep their signatures and results (placement only chooses which to call; one method is added); physical scope keeps its meaning; G1 / G2 only hide files with a `taskAgent` section, which exist only after our migration |

The exact import list is re-verified by the implementer against the registry at the implementation
base (evidence in the handoff).

**Ordering without a global gate (ARCH-F-006).** Revision 3 made every earlier `memory/` migration a
prerequisite; one predecessor that fails deterministically on one package (released dispositions such
as `FAILED_UNSUPPORTED_SOURCE`, `FAILED_FAMILY_CONFLICT`) would then have kept every task agent of
every run unavailable forever (L6) — a lockout of history, against REQ-007 and DESIGN.md rule 7.
Revision 4:

1. **No declared prerequisites.** Ours is registered last, so on every start the runner runs each
   pending or FAILED predecessor before it.
2. **Per-run input gate.** Ours migrates a coordinating run only when its tree is in our input shape:
   readable by the frozen parser (today's records, full or already reduced) with no collaborator
   entries. A tree not in that shape is left untouched, and:
   - if a **tree-writing predecessor** is not yet `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`, that run is
     `WAITING_FOR_PREDECESSOR` (an item counted as FAILED, so ours stays non-terminal and retries next
     start — a later retry of that predecessor may still convert the tree, e.g. collaborators-v1, S27);
   - otherwise the tree can no longer change: `PRESERVED_UNSUPPORTED_TREE` (warning, terminal), its
     task agents not available (L6), files untouched.
   Tree-writing predecessors at the base: `20260814_team_run_execution_tree_v1`,
   `20260824_team_run_execution_tree_v2`, `20260901_agent_org_flat_team_families_v1`,
   `20261015_collaborators_to_delegated_runs_v1` (the implementer confirms the set: every released
   migration that writes a coordinating tree). Every other run migrates in the same start.
3. **A predecessor retried after our move is harmless on moved data.** Tree writers find a reduced
   tree already in their target shape (no collaborators, current version) and skip it; the frozen
   old-layout readers of D-9 find nothing at the old nested places. Content predecessors from before
   task agents existed (≤ `20260731`) never had task agent data to convert (task agents arrived with
   v1.4.53). For `20260926_team_context_file_execution_locators_v1`, a retry after the move finds no
   owner for a moved task agent's reference and leaves that reference as it is — reachable only after
   a non-deterministic failure in the same upgrade (a deterministic one never converts it either), a
   degraded link and never lost data, which is the user's rule for unpredictable failures (§8).

Proof: F-PENDING and its variant F-PENDING-FAILED (§12.3).

## 6. Existing data: every shape, before and after

Counts from the user's data, read-only, 2026-10-17 (88 task agents; none nested; no collaborators
left — converted by `20261015_collaborators_to_delegated_runs_v1`).

| Case | Count | Before | After |
| --- | --- | --- | --- |
| C1 agent task agent of a standalone run | 11 | `agents/<host>/collaboration/<agentRunId>/`, facts in the host's tree | `agents/<agentRunId>/` with its own `run_metadata.json`; link in the host's tree |
| C2 task agent team of a standalone run | 51 | `agents/<host>/collaboration/<teamRunId>/<member>/`, members and source in the host's tree | `agent_teams/<teamRunId>/` with its own team tree and log; members inside |
| C3 agent task agent at a team run's top level | 13 | `agent_teams/<root>/<agentRunId>/` | `agents/<agentRunId>/` |
| C4 task agent team at a team run's top level | 7 | `agent_teams/<root>/<teamRunId>/<member>/` | `agent_teams/<teamRunId>/` |
| C5 task agent at an organization's top level | 4 | `agent_orgs/<org>/<run id>/…` | `agents/…` or `agent_teams/…` |
| C6 task agent created by a mounted team's member | 2 | `agent_orgs/<org>/<mountedTeamRunId>/<run id>/…` | `agents/…` or `agent_teams/…` |
| C7 nested task agent | 0 in data (the 9 delegations by task-team members in the user's data are recorded at the coordinating run, CM-7) | inside a task team record's `taskExecutions` | lifted to a top-level link of the coordinating run (CM-7), own folder at L1; a team link never carries `taskExecutions` (U-5) |

Record facts in the data (read-only, 2026-10-17): 6 task agents have no `source` (2 in team runs,
4 in organization runs: created from a configured place, whose facts are that place's — today they
follow later changes of that place, and after the migration they still do: their own file has
`taskAgent.origin: "configured_place"` and `null` launch fields, so no behavior changes — U-4); 4 have no
`delegatorAgentRunId` (older records); 5 records and 6 team members carry a user Settings edit
(`userLaunchSelection`); no task agent team has a nested team member (the shape is retired by Task
9942a43c and exists in no install; the frozen parser rejects it → `PRESERVED_UNSUPPORTED_TREE`); no task
agent team hosts task agents of its own.

Folder contents move unchanged (raw traces incl. rotated archives, `file_changes.json`,
`context_files/`, native `working_context_snapshot.json`; a team's member folders). Stored absolute
paths into task agent folders: none (only message text quoting old paths — history). The task
agent's new `run_metadata.json` gets its new `memoryDir`.

## 7. Message logs: existing ones

**Decided (the user, 2026-10-17):** the migration builds each task agent's own log from the
coordinating run's existing log — every entry whose sender or receiver is a part of that task
agent — and leaves the coordinating run's log unchanged. Nothing is deleted; views de-duplicate by
`messageId`. New messages follow §3.4.

## 8. The migration

`STARTUP_ONLY`, registered after `20261015_collaborators_to_delegated_runs_v1`, runs before any run
is active. Per coordinating run, per task agent (nested ones first):

0. **Input gate** (§5.4): the tree is not in our input shape → `WAITING_FOR_PREDECESSOR` or
   `PRESERVED_UNSUPPORTED_TREE`; nothing of that run is touched.
1. **Already done?** A folder at L1 whose own file names this coordinating run → skip steps 2–4
   (step 5 still runs).
2. **Write the own file** (§3.1 or §3.2) inside the task agent's current folder, built from its tree
   record — for a record without `source`, from the configured place at its address — with its
   launch provenance, Settings edits, the new `memoryDir` and the `taskAgent` section.
3. **Rename** the folder to L1 (one atomic rename on the same volume; no copy). A task agent that
   never wrote memory has no folder: its own file is written at L1 so its link resolves.
4. **Reduce the tree** (L4): each record whose own file now exists becomes its link; one atomic
   tree write.
5. **Merge the logs** (§7; ARCH-F-003): for every task agent at L1 of this coordinating run —
   moved now or earlier — the coordinating log's entries that belong to it are merged into its own
   log: union by `messageId`, existing entries kept, ordered by `createdAt`, written atomically, only
   when something is missing. A message written to its own log between two attempts is never lost
   (S29).

A coordinating tree the frozen parser cannot read is left untouched and reported as a preserved
exclusion (a warning, not a permanent `FAILED`; guideline §6); its task agents stay not available
(L6). None exist in the user's data (633 trees read, 0 unreadable).

Today's record shapes are read through a frozen copy inside the migration (Data Migration
Guideline: old shapes live only in registered migrations); it accepts a record full or already
reduced.

**What is proven, and what is only recovered (the user, 2026-10-17):** every data shape the
migration meets is deterministic and is proven by faithful fixtures built from the discovered source
structure (§6, §12.3). What nobody can predict — the app or the machine stopping in the middle, a
step failing — needs one property only: the app always starts and stays usable, and the next start
continues the migration, because every step above recognizes from the files what is already done.
No further failure states are designed.

Imported corpora (`memory/imports/…`) are not touched (DEC-007).

## 9. Down-grade

Not supported, as in any upgrade that changes stored data (DEC-006; the user, 2026-10-17: general
software practice). An older app after the migration finds neither the task agents' memory nor
their facts in the coordinating tree; nothing is deleted. No special release-note warning.

## 10. Detached and incomplete states

| State | What the user sees | Never lost |
| --- | --- | --- |
| **detached**: task agent folder whose coordinating run was deleted | a normal state: not listed (sidebar, Memory page), not restored, not reported; the folder keeps its own facts, memory and log, so restoring the hub from a backup reconnects it | the folder |
| a task agent that is not available: a link whose own file is missing (deleted or damaged outside the app), or a record whose migration has not finished | not shown under its run and not restorable; its messages with the coordinating run are not shown in the run's views (L6) | its folder, if any; its facts (L4); its messages (L6) |
| a run whose tree is not yet in our input shape (a tree-writing predecessor may still convert it) | that run works as before the upgrade would allow: its task agents are not available until ours migrates it on a later start; every other run is migrated (§5.4) | everything |
| the migration did not finish (stopped, or a step failed) | the app starts and works; the next start continues | everything |

## 11. What does not change

In memory, every family keeps today's composed record per task agent: the tree stores build it on
load from the link and the task agent's own file, and split it again on save (design D-1). So the
code that works with task agents in memory — indexes, adapters, views, Settings, restore — keeps its
types; only the stores, the placement of memory directories, the two guards, the message stores, the
Memory page attribution, the readiness check and the migration change.


Tool contracts and results; GraphQL / REST / WebSocket shapes; the collaboration texts agents read;
who coordinates a task agent at runtime; the sidebar; Settings behavior; Token Meter; Task pages;
the Memory page Teams / Orgs lists.

## 12. Validation

### 12.1 Done

| ID | Check | Result |
| --- | --- | --- |
| V-1 | Every scanner of the family folders found (§5) | done (`c2e366806a`) |
| V-2 | Sidebar cannot show task agents | holds via G1 (agents) and G2 (teams); team / org rows come from the history index |
| V-3 | Stale cleanup cannot delete a task agent | holds via G1 (task agents have no prepared metadata either) |
| V-4 | Startup check would admit a task agent team (it has a team tree) / flag agent folders | yes without guards → G1, G2 |
| V-5 | Memory page Agents list would show "Unattributed" | yes without the task-agent reader → §5.2 |
| V-6 | Every shape in the user's data | C1–C6 present (88), C7 absent, no collaborators |
| V-7 | Stored absolute paths into task agent folders | none (§6) |
| V-8 | Delete paths | each family deletes only its own folder → §4 |
| V-12 | No code outside §5 builds a task agent path | holds (all callers of the layout's rooted paths are in §5) |
| V-14 | How many places read run metadata directly | ~20 files → G1 keeps them unchanged |
| V-15 | Offline index repair projects admitted team packages | yes → behind G2 |
| V-16 | Every reader / writer of the link's facts (`source`, `members`, `platformAgentRunId`, `userLaunchSelection`) | 28 files use the record types (excluding migrations): all listed in §5.2 (tree mutators, view projections, restore, create, stop set, indexes, adapters, source resolvers, launch selection, schemas) |
| V-10 | Views of messages (communication view, references, stream events) | today they read one log per coordinating run; live, the root keeps one in-memory list per coordinating run. After: the stored view reads the coordinating run's log ∪ its task agents' logs, de-duplicated by `messageId`; the live list stays one per coordinating run. Showing the hub's full communication view reads one log per task agent (same H2 known cost) |
| V-11 | Writing a message's logs under one lock | holds: each message is committed inside the coordinating run's persistence lock (`standalone-root-persistence-coordinator.ts#commitCommunication` `withLock`, team / org equivalents); the hub and its task agents share that coordinator, so the receiver's log then the sender's log need no second lock; a failure after the first log is durable is today's post-durability failure (`latchAndThrow`, fail-stop), never a second delivery; a failure before means not delivered |
| V-18 | Memory Sync, both sides | the Memory page reads an imported source with the same explorer code at `memory/imports/<node>/` (`memory-explorer-source-service.ts#resolveSource`); export covers `agents/` and `agent_teams/`. → §4 rows: no Memory Sync code change; a node's task agents show in imported memory after that node is updated and synced; explorer / Memory Sync tests with old-layout import fixtures are updated to this behavior and a fixture of an upgraded node's export is added |
| V-19 | Released migrations and package validators against this design (ARCH-REV-001) | collaborators-v1 writes trees through the current stores; five more import changed modules (§5.4); package validators require every message endpoint in the index → §5.4, L6, step 5 merge, L1 nested sub-teams |
| V-17 | What the app loads when a hub is opened | the hub's task tree with every team's members and status (`agentRunCollaboration`); the team / org run list sends each run's whole tree → composing them reads each task agent's own record (H2 known cost); reading on expand needs an app change (follow-up) |

### 12.2 Still to do before the contract is final

- V-9 Path-by-path walk of §4 through the code: done at contract level (§12.4) and in the design
  spec's production-path map; the architecture review checks it again.


- V-13 The user reviews this contract (§13): **done** (2026-10-17; the user also confirmed the nested case S9 and the three visible UI differences under P7).

### 12.3 How the result will be proven (after design and build)

- **Test data package — faithful to the released shapes.** Hand-built, small records that mimic
  exactly what the released app wrote (TESTING.md; Data Migration Guideline "Acceptance", item 5):
  their keys and shapes are checked against the shapes read from the user's data (read-only,
  §6) and against the released record types (frozen inside the migration). They are never
  generated by the new code ("a current-generated fixture with old field values" does not count)
  and never copied from the user's data. Content (every shape): C1–C7, a task agent team with members,
  task agents with and without a Task, a partly migrated state (for the next start to continue),
  a task agent that never wrote memory, a detached task agent, message logs with messages inside
  and between runs.
- **Shape inventory → fixture** (Data Migration Guideline checklist item 3). Every shape of §6 has
  a fixture; a shape without one is untested:

  | Shape (from §6, counts on the user's data) | Fixture |
  | --- | --- |
  | C1 agent task agent of a standalone run (11) | F-C1: a standalone hub with one agent task agent (raw traces with a rotated archive, file changes, context files) |
  | C2 task agent team of a standalone run (51) | F-C2: the same hub with two task agent teams, one of which got several Tasks in a row (mode 3) |
  | C3 agent task agent at a team run's top level (13) | F-C3: a team run with one agent task agent |
  | C4 task agent team at a team run's top level (7) | F-C4: the same team run with one task agent team |
  | C5 task agent at an organization's top level (4) | F-C5: an organization run with one agent and one team task agent |
  | C6 task agent created by a mounted team's member (2) | F-C6: the same organization with a task agent under `<mountedTeamRunId>/` |
  | C7 nested task agent (0) | F-C7: a member of F-C2's team delegates (built from the released record type; no released data exists) |
  | record without `source` (6) | F-NS: in F-C3 and F-C5, created from a configured place |
  | record without `delegatorAgentRunId` (4) | F-ND: one record in F-C3 |
  | Settings edit on a record (5) or team member (6) | F-SE: in F-C1 and F-C2 |
  | native `working_context_snapshot.json`; rotated raw traces | in F-C1 |
  | message logs: messages inside a task agent team, between hub and team, between task agents | F-MSG: in F-C2 and F-C4 |
  | a run started again after a stop in the middle (some task agents moved, tree partly reduced); a task agent that never wrote memory; detached | F-RERUN, F-UNMATERIALIZED, F-DETACHED |
  | retired nested task-team shape (0 anywhere; retired by Task 9942a43c) | no fixture; the frozen parser rejects it → `PRESERVED_UNSUPPORTED_TREE` (covered by F-PENDING-FAILED's unsupported-tree case) |
  | the app ran between two attempts: a message to a moved task agent, a save of the tree with an unmoved record | F-RERUN-MSG: in F-C2 |
  | earlier released migrations still pending (upgrade from an older release) | F-PENDING: old-layout data root with `20261015_collaborators_to_delegated_runs_v1` and `20260926_team_context_file_execution_locators_v1` pending, a collaborator to convert and a task-agent team member's context file; result equals upgrading in two steps |
  | one predecessor stays FAILED for one root (ARCH-F-006) | F-PENDING-FAILED: three roots — A converted fine, B whose tree collaborators-v1 deterministically fails (FAILED), C whose tree no predecessor can read any more. After start: A's task agents moved and available; B `WAITING_FOR_PREDECESSOR`, untouched, ours non-terminal; C `PRESERVED_UNSUPPORTED_TREE`; a second start changes nothing for A and C; when B's predecessor later succeeds, the next start migrates B |

- **Server tests**: create / restore / wake / Settings edit / delete per family; G1 and G2 (a task
  agent is never listed, admitted or restored as a run the user started); migration per shape of
  the inventory; a start that continues a partly migrated state; second start is a no-op; L4 (a
  save never erases facts); nothing lost (file list, sizes, hashes).
- **Real-app run** (team rule): an isolated desktop instance built from the branch with the test
  data package — startup with migration, sidebar unchanged, open a coordinating run and its task
  agents (conversation, file changes, context files, Settings model edit), Memory page Agents
  list, delete a coordinating run keeps its task agents' folders (detached, not shown), second start
  changes nothing.

### 12.3a Memory Sync and the existing tests (in this ticket)

- Memory Sync keeps working on the new layout here (REQ-015): export of task agents as their own run
  folders; the Memory page over an upgraded node's import shows hubs with their task agents; an
  import from a node not yet upgraded shows its hubs without task agents. Fixtures: an upgraded
  node's export (F-SYNC-NEW) and an old-layout import (F-SYNC-OLD).
- Future ticket, not here: exporting organization runs themselves; selected-run sync; sync status
  per run; cleaning old nested residue on receiving nodes; cross-node delegation.
- Tests that encode the old layout are planned updates, not regressions (REQ-016): implementation
  begins with a test impact inventory and updates each listed test to this contract, recording why.

- Naming (§3.5, REQ-019): implementation lists every current-code name carrying a version number
  (server at the base: the three message-log families — `collaboration-communication-message-v1*`,
  `agent-org-communication-messages-v1*`, `team-communication-v1-*` — and their types, validators, path
  helpers and file-name constants such as `TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME`; web: e.g.
  `AppLeftPanel_v2.spec.ts`) and renames them; on-disk names and values unchanged; migrations only
  update their imports.

### 12.4 Simulations (2026-10-17)

Each case walked step by step against §1–§10. Result "holds" means every rule touched gives one
answer; "fixed" means the walk found a contradiction or a loss, corrected in this revision.

| # | Case | Rules touched | Result |
| --- | --- | --- | --- |
| S1 | The Project Task Manager delegates a new task agent team | L1, §3.2, §4 Delegate, G2, H3 | holds: own team tree + empty log at `agent_teams/<id>/`, then the link; not admitted as a team run; no history row |
| S2 | Two members of a task agent team message each other | §3.4 | holds: once, in the team's log |
| S3 | The team's coordinator reports to the Project Task Manager | §3.4, DEC-011 | holds: the hub's log (received) first, then the team's (sent), one id |
| S4 | Follow-up Task to the same team (mode 3) | §3.3, §4 | holds: link and own tree unchanged; Projects records the assignment |
| S5 | Settings: change a stopped member's model | §4 Settings, H3 | holds: only the team's own tree is written; the hub's tree is not |
| S6 | Server restart, hub reopened | H2, §11 | fixed: H2 now says the small own files are read to build the records; runtimes are not built |
| S7 | Wake a task agent by run id | §4, L1 | holds: restore from its own folder and own file |
| S8 | Delete the hub, later restore it from a backup | §4 Delete, §10 detached | holds: task agents kept, not shown, not logged as errors; reconnected on restore |
| S9 | Nested: a member of the hub's task agent team delegates | L1, §3.1 table, §3.2, §3.4 | holds: coordinating run = the hub, delegator = the member; link at the hub's top level; messages in both runs' logs under the hub's lock |
| S10 | A member of a team the user started delegates | L1, §3.3 | holds: link at `rootTeam.taskExecutions`; own folder at `agents/<id>/` |
| S11 | Organization: the Project Task Manager (direct agent) delegates to the organization's team | §3.3 | fixed: new links are always at the top level; only old records stay under `members[]` (C6) |
| S12 | Migration: a task agent without `source` | §3.1 origin, §6, §8 step 2 | revised (U-4): its own file records `origin: "configured_place"`; it keeps following the place; no behavior change (the earlier "takes the place's values at upgrade" change is withdrawn) |
| S13 | The app stops in the middle of the migration; next start | §8 | holds: each step recognizes what is done and continues |
| S15 | The migration did not finish, then the user delegates something new | L4, §10 | **fixed (data loss)**: without L4 the save would have erased the unmoved record's facts; L4 keeps the record until its own file exists |
| S16 | Migration: a task agent that never wrote memory | §8 step 3 | fixed: its own file is written at L1 so its link resolves |
| S17 | Failure states (conflicts, dependent ordering, orphans) | §8, §10 | removed by the user's direction: the app keeps working and the next start continues; only the deterministic shapes are designed and proven |
| S18 | Old message logs after the upgrade | §7, H1 | fixed: H1 now says only new messages; old ones stay in the hub's log; views de-duplicate |
| S19 | The same fact in the link and the own file | P2, §3.1, §3.3 | fixed: P2 now distinguishes changing facts (one owner) from the unchanging relationship facts recorded on both sides |
| S20 | A task agent created from a configured place keeps that place's handoff rules | §11 | holds: the prompt's scope is computed from the composed records, unchanged |
| S21 | Memory page lists a task agent; the user opens its memory | §4 Memory page | holds: listed under its definition; memory view reads `agents/<id>/` by run id |
| S22 | A detached task agent on the Memory page | §4, §10 | holds: not listed (its coordinating run is gone) |
| S23 | A task agent's runtime session id changes | §3.1, H3 | holds: the change is in the own file only (design change detection) |
| S24 | Real-app run description | §12.3 | fixed: delete keeps the task agents' folders |
| S25 | §5.2 against the design's persistence-boundary approach | §5.2, §11 | fixed: §5.2 now lists what changes and what keeps working unchanged |
| S26 | Memory Sync import of a hub from another node | §4, DEC-007, V-18 | holds: shown after that node is updated and synced; before that its task agents are not shown, nothing lost |
| S27 | Upgrade from a release before 2026-10-15: the collaborators migration runs first, through the new stores | §5.4 | **fixed (silent loss of history)**: its converted records would get own files at L1 before their memory moves and ours would skip them; repointed to frozen writing, and ours waits for it |
| S28 | Upgrade from a release before 2026-09-26: the context-file locator migration runs on old data with owners computed by the new placement | §5.4 | **fixed**: task-agent members' attachment references would never be converted; repointed to today's validator |
| S29 | Ours fails for one task agent; the user keeps working; a message goes to a moved task agent; next start | §8 step 5, L6 | **fixed**: step 5 merges, so the new message is kept; the unmoved one is not loaded, its record written back unchanged |
| S30 | An unmoved task agent shown and woken before its move | L6 | **fixed**: it would start with empty memory at L1 and its folder would block its own move; now not loaded until moved |
| S31 | A Team root whose stored log names a task agent that is not available | L6, L5 | **fixed**: the package validator would reject the whole team run; views now show only messages whose endpoints are loaded |
| S32 | Withdrawn (revision 4): nested task-team members no longer exist (Task 9942a43c) | — | — |
| S33 | One predecessor deterministically FAILED for one root (ARCH-F-006) | §5.4 | **fixed (lockout of history)**: revision 3 kept every task agent unavailable forever; now only that root waits, every other root migrates |
| S34 | collaborators-v1 converts a tree only on a later start | §5.4 step 2 | holds: that tree waits (ours non-terminal), then migrates |
| S35 | A predecessor retried after our move | §5.4 step 3 | holds: tree writers skip reduced trees; old-layout readers find nothing; locator retry leaves a moved reference unconverted only after an unpredictable failure (bounded) |

## 13. Open questions for the user

- Decided (the user, 2026-10-17): revision 2 — each task agent owns its facts; the hub keeps links
  (§0); proof on small synthesized data covering every shape, not on data of the real size.
- Decided (the user, 2026-10-17): existing message logs — each task agent's own log is built from
  the coordinating run's log, which stays unchanged (§7); REQ-012's "keeps only its own" is
  replaced.
- Decided (the user, 2026-10-17): deleting a coordinating run keeps its task agents' folders
  (detached, §10); DEC-005 is reversed. Follow-up: a Memory page view that shows detached task
  agents, opens their memory and lets the user delete them.
- Decided (the user, 2026-10-17): no downgrade, as in any upgrade (§9).
- Decided (the user, 2026-10-17): message logs keep today's whole-file write in this ticket; an
  append-only message log (JSON Lines, one message per line, rotation like raw traces) is a
  follow-up Task right after this one.
