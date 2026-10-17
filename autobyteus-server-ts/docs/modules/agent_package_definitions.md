# Agent Package Definitions

## Scope

**Agent package definitions** are the agent, agent team and agent org definitions
read from registered **agent packages**: the app-data default package,
`AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entries, and imported local or GitHub-managed
packages. This subsystem loads them, watches the package folders for changes,
and tells connected web clients which lists changed. Every reader uses the same
loaded definitions, so delegation, `list_available_agents`, `@` mentions, the
GraphQL lists, admission and run create/restore all agree.

The definitions stay current on their own. A file watcher reports changes in
each registered package folder, the reloader applies them after a short settle
window, and the changed lists are announced on `/ws/agent-package-definitions`
so loaded web lists reload. Reload and package actions remain as a manual
fallback.

Application-package definitions (agents and teams shipped inside application
packages) are **not** agent package definitions and are not held here. The agent
and team services read them on demand, from their application packages, for
list results and exact-ID reads. A malformed application-package agent or team
is logged (`APPLICATION_PACKAGE_AGENT_SKIPPED`, `APPLICATION_PACKAGE_TEAM_SKIPPED`)
and skipped; it never fails a list.

## TS Source

- `src/agent-package-definitions/domain/` — `AgentPackageDefinitionKind`,
  `AgentPackageDefinitionList`, load issue codes, definition and definition
  folder read results, registered package folders, definition file helpers and
  the shared package-folder readability rule.
- `src/agent-package-definitions/services/agent-package-definition-store.ts` —
  `AgentPackageDefinitionStore`: definition folders, the last-good rule,
  copy-returning reads, load issues.
- `src/agent-package-definitions/services/agent-package-definition-reloader.ts` —
  `AgentPackageDefinitionReloader`: first load, pending changed folders, settle
  timer, serialized reload queue, `listsAffectedBy`, change announcements.
- `src/agent-package-definitions/services/agent-package-definitions.ts` —
  `AgentPackageDefinitions` (`{ store, reloader }`), the process instance.
- `src/agent-package-definitions/providers/` — the three folder readers
  (`AgentFolderReader`, `AgentTeamFolderReader`, `AgentOrgFolderReader`) and
  definition folder presence.
- `src/agent-package-definitions/monitor/` — `AgentPackageFolderWatcher` and the
  package layout allow-list `agent-package-layout.ts`.
- `src/agent-package-definitions/changes/` — `AgentPackageDefinitionChangeHub` and
  the frame contract.
- `src/api/websocket/agent-package-definitions.ts` — the
  `/ws/agent-package-definitions` route.
- `src/api/graphql/types/definition-problems.ts` — `definitionProblems(kind)`,
  `DefinitionLoadIssue`, `DefinitionLoadIssueEntry`.
- `src/api/graphql/types/agent-package-definitions.ts` — the
  `reloadAgentPackageDefinitions` mutation.

## Definition Folders

The store reloads **definition folders**, not single files. A definition folder
is one top-level folder under `agents/`, `agent-teams/` or `agent-orgs/`, read
together with the definitions nested inside it:

| Definition folder | Contains |
| --- | --- |
| Agent folder | `agents/<a>/` |
| Team folder | `agent-teams/<t>/` and its team-local agents `agents/<a>/` |
| Org folder | `agent-orgs/<o>/`, its org-owned agents `agents/<a>/`, and its org-owned teams `agent-teams/<t>/` with their `agents/<a>/` |

Each definition, nested ones included, is addressed by its canonical definition
ID (the existing team-local and org-owned ID helpers). A definition folder is
**present** when at least one of its two definition files exists, so an empty
folder created before its files is not an error.

## Last-Good Rules

Every definition, nested ones included, is applied independently:

| Read result | Previous definition | Result |
| --- | --- | --- |
| Valid | any | Store the definition and fingerprint; clear the load issue |
| Invalid | had a definition | Keep the **last working version**; record a load issue |
| Invalid | none | Unusable: reads return nothing; listed in definition problems |
| Folder gone (package present) | any | Remove the definition and its nested definitions |
| Package folder registered but missing or unreadable | had a definition | Keep the whole definition folder; load issue `DEFINITION_SOURCE_UNAVAILABLE` on its own definition |
| Package unregistered | any | Remove the definition folder |
| Team/org ID present in more than one registered package | any | Unusable, load issue `DEFINITION_IDENTITY_DUPLICATED` listing the paths |

- One broken file never fails the store or removes a working definition. A
  broken `team.md` keeps the team's last working version while its local agents
  are applied on their own.
- Load issue codes: `DEFINITION_CONTRACT_INVALID`, `DEFINITION_FAMILY_MISMATCH`,
  `DEFINITION_SOURCE_UNAVAILABLE` (the package folder is missing or cannot be
  read), `DEFINITION_IDENTITY_DUPLICATED`. A load issue carries `code`, `reason`,
  `definitionPath` and `packageRoot`.
- Precedence: for agents, the first registered package that has the ID wins.
  A team or org ID must be unique across packages. A duplicated team or org is
  unavailable to **every** reader: it is not launchable, not listed, and not
  offered by `list_available_agents` or `@`.
- Changes are detected by a SHA-256 fingerprint of each definition's two files,
  so in-app save echoes and unchanged rewrites announce nothing.
- Reads always return copies; callers cannot mutate a stored last working
  version.

Nothing is persisted. Definitions, last working versions, load issues and watch
status are rebuilt at startup.

## Change Detection And Settle

`AgentPackageFolderWatcher` runs in-process chokidar watchers on
`<package>/agents`, `<package>/agent-teams` and `<package>/agent-orgs` for every
registered package, GitHub-managed ones included. A structural allow-list limits
watching to the package layout:

```
agents/<a>/{agent.md,agent-config.json}
agent-teams/<t>/{team.md,team-config.json}
agent-teams/<t>/agents/<a>/{agent files}
agent-orgs/<o>/{org.md,org-config.json}
agent-orgs/<o>/agents/<a>/{agent files}
agent-orgs/<o>/agent-teams/<t>/{team files | agents/<a>/{agent files}}
```

Skills, docs, scripts, `.git`, `node_modules`, other files and `_`-prefixed
names are not watched. A skill edit is therefore never announced on this feed;
runtime bootstrap reads skills from disk anyway (see [Skills](./skills.md)).
Active runs that use a changed skill are told separately, by
[Skill Update Notices](./skill_update_notices.md).

Each event path is mapped to one definition folder `(kind, folderId)`.
`AgentPackageDefinitionReloader` keeps the pending changed folders and applies
them after **1000 ms of quiet, capped at 3000 ms** from the first pending
change. Both constants are injectable for tests.

**Read-your-writes.** Every service read first calls `applyPendingChanges()`,
which applies pending changes before answering. A definition written by an
agent's tool is therefore visible to the next `delegate_task` or
`list_available_agents` as soon as the watcher has detected the write. In-app
saves go through the file provider and then `reloadFoldersNow`, so they never
wait for the watcher.

The reload queue is serialized. A per-folder read error becomes a load issue
and never fails a batch. An unexpected infrastructure error fails only that
batch, is logged, and leaves its folders pending for the next read.

### Package Folder State

Each registered package folder has an auto-refresh state, exposed as
`AgentPackage.autoRefresh { state, message }`:

| State | Meaning | Transitions |
| --- | --- | --- |
| `WATCHING` | Changes are detected automatically | Armed when the folder exists and its kind folders can be listed |
| `FOLDER_MISSING` | The package folder does not exist | The watcher watches the nearest existing ancestor and re-arms when the folder reappears; its definitions keep their last working version with `DEFINITION_SOURCE_UNAVAILABLE` |
| `UNAVAILABLE` | Watching failed: a kind folder cannot be listed, or a watcher error such as `ENOSPC` or `EMFILE` | `message` carries the reason; manual Reload still works; the next registration sync re-arms it |

The watcher records the device and inode of each watched package folder. A
folder replaced in place (the GitHub Update rename swap) is re-armed both from
the watch event and from the full reload that Update already runs. Every state
change announces `agent_packages`.

`autoRefresh` is `null` when no watcher runs (the standalone application host)
or the folder is not tracked.

## First Load And Full Reload

The reloader starts empty. The first `applyPendingChanges()` runs one
`reloadAllPackages()`, and concurrent first reads share it. In the studio server
the watcher is armed **before** the startup admission scan, which performs that
first load, so no change is missed during startup. Startup does not wait for
watcher readiness.

`reloadAllPackages()` lists every registered package, reloads every definition
folder, removes the folders of unregistered packages, then calls the
registration listener (`watcher.syncPackageFolders()`: start watching new
packages, stop removed ones, re-arm failed or replaced ones). Triggers:

- the `reloadAgentPackageDefinitions` mutation (the Reload buttons on the
  Agents, Teams and Orgs pages; each service's `reloadAgentPackageDefinitions()`);
- package import, removal, local Reload and GitHub Update (`AgentPackageService`
  calls `reloadAgentPackageDefinitions`);
- the built-in agent bootstrapper, which writes all built-in agents, then calls
  `reloadAgentPackageDefinitions()` once, then resolves each built-in.

Application readiness does not reload: application-package definitions are read
on demand.

## Admission

`DefinitionAdmissionService.scan()` and `requireAvailable(kind, id)` list the
store's team and org folders (unusable ones included) and org-owned teams, plus
the application-package team sources from the narrowed
`DefinitionSourceRegistry`. Admission's reference, dependency and handoff
validation is unchanged. Duplicate results come from the readers. A team or org
whose package folder has gone missing stays listed and launchable with its last
working version.

## Change Announcements

The reloader announces once per batch, naming the web lists to reload,
dependent lists included:

| Changed kind | Announced lists |
| --- | --- |
| `agent` | `agents`, `agent_teams`, `agent_orgs` |
| `agent_team` | `agent_teams`, `agent_orgs`, `agents` (team-local agents) |
| `agent_org` | `agent_orgs` |
| package folder status or registration | adds `agent_packages` |

`/ws/agent-package-definitions` is server-to-client only, uses remote-access
websocket authentication, and sends:

```json
{ "type": "connected" }
{ "type": "agent_package_definitions_changed", "changedLists": ["agents", "agent_teams", "agent_orgs", "agent_packages"] }
```

The frame names lists only; clients re-read through GraphQL.

## GraphQL Surface

| Field / query / mutation | Purpose |
| --- | --- |
| `AgentDefinition.loadIssue` | Nullable `DefinitionLoadIssue {code, reason, definitionPath, packageRoot}` on a shared agent served from its last working version |
| `AgentTeamDefinition.loadIssues`, `AgentOrgDefinition.loadIssues` | Every load issue in the definition folder: the Team or Org first, then nested definitions in path order. Type `DefinitionLoadIssueEntry {kind, definitionId, name, code, reason, definitionPath, packageRoot, usingLastGood}`; empty when clean |
| `definitionProblems(kind: DefinitionKind!)` (`AGENT`, `AGENT_TEAM`, `AGENT_ORG`) | `DefinitionProblem`: definitions that cannot be used (unusable, or admission-unavailable with `DEFINITION_REFERENCE_UNRESOLVED` or `DEFINITION_DEPENDENCY_UNAVAILABLE`) plus last-working-version load issues (`usingLastGood: true`), with `dependencyChain` |
| `reloadAgentPackageDefinitions: Boolean!` | Full reload of every registered agent package (the Reload buttons) |
| `AgentPackage.autoRefresh` | Package folder watch state and message |

## Lifecycle And Composition

- `createHostDefinitionServices` builds readers → store → reloader → services →
  admission for both the studio server and the standalone application host, and
  exposes `agentPackageDefinitions` (`{ store, reloader }`).
- The studio server adds the hub and the watcher
  (`compositions/agent-package-definition-feed-composition.ts`). Shutdown closes
  the watcher, then the hub, then the definition services.

## Ownership Rules

- Definition services are the only public boundary. Callers never touch the
  store, readers, reloader or file providers, and never read disk for a
  "fresher" copy.
- The reloader is the only store writer. The watcher only reports changes and
  never parses definitions.
- Only the readers list package folders. The registry holds only
  application-package team sources.
- The hub owns fan-out only and imports no definition modules.

## Removed In This Design

Do not reintroduce:

- `CachedAgentDefinitionProvider` and `CachedAgentTeamDefinitionProvider`;
- the fresh path `getFreshAgentDefinitionById` / `getFreshDefinitionById`;
- admission's disk enumeration of shared team/org packages and its decode
  pre-read;
- the registry's `implementationPackageRoots` option;
- GraphQL `definitionAdmissionDiagnostics` (replaced by `definitionProblems`);
- the root-only `loadIssue` on teams and orgs (replaced by `loadIssues`);
- the three per-page refresh mutations (replaced by
  `reloadAgentPackageDefinitions`);
- application-package agents and teams held as store entries, and the
  application readiness reload that refreshed them.

## Operational Notes

- Linux and Docker: chokidar also watches files, so expect roughly 400–700
  inotify watches for a large package set. A watch limit shows as
  `UNAVAILABLE` on the package row; Reload still works.
- Events lost on sleep or on unusual filesystems are corrected by any full
  reload (Reload).
- A run reads its definition when it is created or restored. Running sessions
  keep the definition they started with.

## Related

- [Agent Packages](./agent_packages.md)
- [Agent Definition](./agent_definition.md)
- [AgentTeam Definition](./agent_team_definition.md)
- [AgentOrg](./agent_orgs.md)
- Web: [Agent Management](../../../autobyteus-web/docs/agent_management.md),
  [Settings](../../../autobyteus-web/docs/settings.md#settings-agent-packages-auto-refresh)
