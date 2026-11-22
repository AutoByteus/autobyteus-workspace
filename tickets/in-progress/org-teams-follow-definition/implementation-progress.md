# Implementation Progress (working notes, implementation engineer)

Working notes for the eight slices of design SR-010 (ARCH-REV-005). Authoritative results go to
`implementation-handoff.md` at the end; this file tracks the plan, decisions and status while the work is in progress.

## Approach

- Slices 1-3 build the container next to the existing Org root, under `agent-org-execution/container/`, selected by the
  stored file's shape (`rootOrg.units` = container; `rootOrg.members` = released Org tree v1, still served by the old
  root until slice 4). New Orgs are created as containers once the container covers start, messages, view, rows and
  readers (end of slice 3). Slice 4 removes the hosting root; slice 5 converts stored Orgs.
- Each commit: server typecheck passes at the baseline, the touched suites pass.

## Slices

| # | Slice | Status | Commit |
| --- | --- | --- | --- |
| 1 | `containedIn` on Team and agent runs; container file; `AgentOrgContainer` creates unit runs; Stop/reopen | part 1 done (building blocks; wiring with slice 3) | see git log |
| 2 | Container address resolution (step 2 via `OrgContainerPort`), `same_container` admission in `CrossRunMessageDelivery`, `ContainedTeamAddressSpace` (R-1''/R-1'''), Org rules merged into unit rules, delegation origin = unit run | done (part 1: all surfaces with unit tests) | see git log |
| 3 | `OrgViewComposition` (R-3''), command routing, run-tree rows, history/memory readers, the three Org REST edges (R-7); switch creation to containers | done (parts 1-4): composition, live container, creation switch, rows, stored view, readiness, history (no unit rows, archive/delete with units), member views/messages/last activity from units, stopped-Org settings, REST edges, memory attribution and sync exclusion | see git log |
| 4 | Remove the hosting machinery (Removal Plan, R-5 H rows) | done: old root, scope builder, persistence, Org log, loader/validator, recipient resolver removed; manager containers-only; readers containers-only; tests converted (stored-container helper) or removed with the hosting they covered | see git log |
| 5 | Migration `20261122_agent_org_units_own_runs_v1` + follow-ups + §9 fixtures + registry classification | done: conversion, 18 follow-ups, classification test, fixtures of every released shape, retry/repeat/reader-wait, cost; stored-Org rows/participants read through units; agent unit activation state | see git log |
| 6 | Org follow (DS-006) | done: pure planner, definition view, committed follow (units first, then file), leaving units, Org rules filtered by member presence (REQ-004), net notices (R-6), listener + follow on reopen, rows/view, web Leaving tag | see git log |
| 7 | FU-003 peer members notice + reconcile (DS-007) | done: signed `/rest/remote/peer-run-members`, receiver on the delegating node, Task entry update, notice from a peer-started Team root, reconcile from run summaries | see git log |
| 8 | Docs (collaboration model CM-3/§3/§5, agent_orgs, agent_memory, glossary), release notes | done (also agent_team_execution) | see git log |

## Slice 3 plan (working)

- 3a `composeOrgExecutionTree` (pure): container file + unit files → today's `AgentOrgRunExecutionTreeSnapshot` (agent
  nodes from agent unit metadata, Team nodes from Team trees with `toOrg`, handoffs = Org rules + Team rules `toOrg`), so
  the web Org contract and `projectAgentOrgExecutionTree` stay unchanged.
- 3b `OrgViewComposition` (R-3, R-3''): per live unit `openViewSnapshotConnection`; Team events: AGENT →
  `agent_presentation` (payload is an `AgentPresentationEvent` → `projectAgentPresentationMessage`), MEMBER_INPUT →
  `agent_presentation` MEMBER_INPUT_MESSAGE (same fields), COMMUNICATION → `communication` (relay rule: the unit that has
  the receiver; a message leaving the Org from the sender's unit), MEMBERSHIP → in-band re-snapshot. Agent unit: its root's
  view gives communication + lifecycle; its agent's presentation comes from `AgentRun.subscribeToEvents` through
  `AgentRunPresentationAdapter` (INTER_AGENT_MESSAGE is a collaboration duplicate); a user message sent from the Org view
  to an agent unit is published by the composition as MEMBER_INPUT_MESSAGE (the Org root did it via its handle callbacks).
- 3c a live container facade with the stream handler's interface (`isActive`, `openViewSnapshotConnection`,
  `executeAgentCommand(WithExecutionKind)`, `resolveCollaboratorMentions`) routing to unit roots (restore on SEND_MESSAGE).
- 3d service/manager: create → container; `getActive` → container; restore/terminate/archive/delete/inspection;
  history catalog; rows (`run-tree-view` Org path from units); readers (records, member views, last activity); REST edges
  (R-7); top-level lists skip `containedIn` runs; statuses; `RunOwnAgentsReader` agent_org branches read containers.

## Decisions taken during implementation

- Slice 1 (part 1): `containedIn` is a shared domain type (`agent-collaboration/domain/contained-in.ts`) with one schema
  parser; the Team tree refuses `containedIn` together with `delegatedFrom`/`copiedFrom` (contract §3); the agent metadata
  reader refuses `containedIn.address` ≠ `address` and a contained run that is also delegated (contract §4).
- The container file is a new type and schema (`AgentOrgContainerFile`, `rootOrg.units`/`formerUnits`) on the same path as
  the released Org tree; `isAgentOrgContainerPayload` tells the two apart until slice 4 removes the old one.
- Units are created through their own run services (`AgentOrgUnitRuns` port): Team units by `createTeamRun` (team space,
  `containedIn`, the Org's `applicationBinding`), agent units by `prepareAgentRun` (Org address, `containedIn`, the Org's
  binding as `applicationBinding` → the agent's application context, contract §11). Run IDs come from those services.
- Startup's empty-never-started cleanup keeps contained agent runs (an Org agent unit stays prepared until its first work).

- Slice 2: the container directory (`OrgContainerDirectory`, the one `OrgContainerPort` answerer) is created with the Task
  side and given to the `DelegationIndex`: a unit run's `CollaborationTree.stepTwo()` is its container's other units (no
  Task ever names a unit run: a contained run cannot be delegated). Step 2 therefore lives where today's step 2 lives (the
  dispatcher's `beyondOwnRun`, `reached`/`reachedPlacementAt`, `reachingAddressOf`), so `send_message_to`, `@`,
  `list_available_agents`, `delegate_task`'s in-run placements and the received header all read one enumeration; unit
  roots hold only `containedIn` (design R-2: the port answers, the unit asks).
- `same_container` (N-1: `sameContainer` from both runs' `containedIn`) is decided first in `CrossRunMessageDelivery.route`;
  the receiver is restored through `receiverRoot` (DEC-006). Relation `same_container` is new: both lines get `counterpart`
  with the other side's Org address (contract §5: the sender line from the directory's `unitOfAgent`, the receiver line from
  the `senderAddress` the collaboration tree gives); `MessageViewScope` shows it in its two runs' views.
- `ContainedTeamAddressSpace` is applied inside `TeamRunMessageDelivery` (In: send/delegate; Out: result address, header,
  former-member text), `teamCollaboratorPortFor` (list/@ addresses), `teamMentionViewerOf` (own Team mention `P`),
  `TeamChangeNoticeSource` (Joined/Left), `MemberExecutionContextBuilder` (rules shown in the Org + Org rules from `P/x`).
- A direct Org agent's context (`agentCollaboration`): role `org_agent`, team-scoped, organization line, the Org's instruction
  and the Org rules from its address, read at each call (they will follow the Org definition in slice 6).
- `inOrganization()` became async: a unit run, or a run a unit (or an Org) assigned.
- `delegation-index.ts` was 536 lines at base (over the 500 guide); it is 538 now (constructor parameter and its doc line).

- Slice 3: the Org view is exact by a synchronous relay plus a snapshot that reads the live units' parts in the base's
  synchronous step (instead of per-unit snapshot connections, R-3''): frames relayed before the base are in the parts,
  later ones follow the base (the test publishes continuously while two views open). In-band snapshots on unit liveness or
  parts changes (`composition_changed`).
- The live container (`LiveAgentOrgContainer`) is registered in the active root directory (so Org views follow its
  lifecycle as before) and hosts no agent (refuses run messages). Commands route to unit roots: a message restores the
  unit (DEC-006), interrupt/approval reach a live unit only (N-2).
- Org rows: `readAtBase(org)` adds the unit runs' delegated rows, anchored under their unit's part; `ChildRowsFeed` also
  notifies a unit's container (`containerOf`, from the directory's unit index).
- Pre-existing environment failures in this worktree (not this ticket's): file watchers (no built watcher runtime),
  application backend workers / Brief Studio packages (no built `dist/`), `app-config` env text, Socratic app tests, the
  studio HTTP contract's network refusal (the test client address is admitted in this container).
- `agent-org-run-manager.ts` is 515 lines while the released root still lives beside the container; slice 4 removes it.

- Slice 4: removed test suites that covered only the removed Org root (scope builder, Org manager lifecycle/restore
  self-heal/termination/inspection/config on the released tree, Org member scope, Org collaborators, Org command kind,
  Org communication presentation, status traversal, the Org cases of the configured-root fixtures, the
  agent-org-flat-team-families-v1 runtime continuation tests). Their behaviors live in the Team/agent roots' suites and
  the container suites; the continuation into the runtime returns with the slice 5 migration tests. Reader suites keep
  their Org cases on stored containers (`tests/helpers/stored-org-container.ts`).
- An Org file that is not a container (a released Org tree its conversion left: a preserved skip or a failure) is not a
  current package (readiness diagnostic) and is never loaded; its history row can still be archived/deleted (the history
  catalog keeps its released-tree path for that residue).
- Environment-dependent e2e failures seen here (not this ticket's): memory explorer GraphQL e2e counts the definitions
  this worktree's data dir ships (26 Teams, 3 Orgs) where the test expects none.

- Slice 5: the conversion is written in owned files (`released-org-tree-v1.ts` parse/classify, `org-unit-targets.ts` target
  files, `org-log-split.ts`, `org-delegations.ts`, `org-conversion.ts`); each step is atomic per file and recognized when
  done (no journal); the container file is written last. Unit logs are written in today's rotated layout (sealed at 4 MiB,
  frozen constant), so a large Org log stays within the limit after the split (AOML e2e's 9.6 MB Org log).
- An agent unit's run file gets today's activation state (contract §4 says "the current standalone agent metadata"): started
  (Org `createdAt`) when it can be restored as it ran (an external runtime with its provider conversation; the server
  runtime with its own trace), else prepared. Without it a converted agent unit could not be activated (found by the AOML
  e2e: "not in a supported activation state").
- Registry classification: `team_run_history_index_v2` is `none`, not a rebuilder (it builds rows only from
  `team_run_metadata.json`, which no unit has; its repair re-reads listed rows only), checked by running it late.
- A stored Org's rows and participants (fresh process, Org not live): `RunTreeView.prepare` and
  `DelegatedRunAgentsReader.prepare` read the container once before the synchronous step (`unitRunsOf` knows only containers
  read or live); found by the AOML e2e (an Org's delegated runs missing from its tree).
- Existing tests that run the production registry or its later chain now end with converted Orgs: their expectations were
  moved to the container end state (team-run-v1, TAU, AOML e2e; skip-version, definition non-mutation, locator transition,
  append-only); tests that build the ledger from a fresh start remove our migration's rows too (as for 461's).
- Slice 6: a removed unit that is running is a former unit marked `leaving` (as 22's former member), its rows tagged, its
  agents still take the Org view's commands; it stops once its view reports no open work, then a release write clears the
  marker; Stop and reopen clear markers. Org-level `Joined:`/`Left:` lines use 22's notice text unchanged (its header
  "Your team changed: its definition was updated." also for an agent unit; design § Exact Texts).
- Org rules are filtered by the target member's presence at each read (`orgRulesFrom`); the directory knows Team unit
  members synchronously (live tree, else last read, loaded with the container). A Team unit's change reaches its Org's
  rules through `TeamChangeNoticeSource.bindOrgRules` (one net notice with the Team's own change, R-6).
- Slice 7: the notice is best effort and sequential per run (members read at send time); a missed one is reconciled at
  the next contact from the run summary's `team` (an older peer answers without it).

## Open questions

(none yet)
