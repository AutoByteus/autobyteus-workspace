# Definition Catalog

## Scope

The definition catalog is the single in-memory inventory of agent, team and org
definitions that come from registered package roots: the app-data default root,
`AUTOBYTEUS_AGENT_PACKAGE_ROOTS` entries, and imported local or GitHub-managed
packages. Every reader uses it, so delegation, `list_available_agents`, `@`
mentions, the GraphQL lists, admission and run create/restore all see the same
definitions.

The catalog keeps itself current. A file watcher reports changes under each
registered root, the sync applies them after a short settle window, and the
changed subjects are published on `/ws/definition-catalog` so loaded web lists
reload. Reload and package actions remain as a manual fallback.

Application-owned definitions (application bundles) are not part of the catalog.
They keep exact disk reads and their readiness-triggered reload.

## TS Source

- `src/definition-catalog/domain/` — `DefinitionSubject`, issue codes, node and
  unit read outcomes, registered package roots, definition file names.
- `src/definition-catalog/services/definition-catalog.ts` — `DefinitionCatalog`
  (one per subject): units, the node reconcile rule, copy-returning reads.
- `src/definition-catalog/services/definition-catalog-sync.ts` —
  `DefinitionCatalogSync`: population, pending units, settle timer, serialized
  reconcile queue, subject expansion, publication.
- `src/definition-catalog/providers/` — the three source readers (agent, team,
  org) and unit presence.
- `src/definition-catalog/monitor/` — `PackageDefinitionMonitor` and the path
  grammar `definition-structure-paths.ts`.
- `src/definition-catalog/changes/` — `DefinitionCatalogChangeHub` and the frame
  contract.
- `src/api/websocket/definition-catalog.ts` — the `/ws/definition-catalog`
  route.
- `src/api/graphql/types/definition-diagnostics.ts` —
  `definitionDiagnostics(subject)`.

## Definition Units

The catalog reconciles **units**, not single files:

| Unit | Contains |
| --- | --- |
| Shared agent | `agents/<a>/` |
| Team unit | `agent-teams/<t>/` and its team-local agents `agents/<a>/` |
| Org unit | `agent-orgs/<o>/`, its org-owned agents `agents/<a>/`, and its org-owned teams `agent-teams/<t>/` with their `agents/<a>/` |

Each definition inside a unit is a **node**, addressed by its canonical
definition ID (the existing team-local and org-owned ID helpers). A definition
folder is **present** when at least one of its subject's two definition files
exists, so an empty folder created before its files is not an error.

## Reconcile Rules (Last Good)

Every node, nested ones included, is reconciled independently:

| Read outcome | Previous node | Result |
| --- | --- | --- |
| Valid | any | Store the definition and fingerprint; clear the issue |
| Invalid | had a definition | Keep the **last good** definition; record an issue |
| Invalid | none | Issue-only node: reads return nothing; listed in diagnostics |
| Folder gone (root present) | any | Remove the node and its children |
| Root registered but missing | had a definition | Keep the whole unit; root node issue `DEFINITION_SOURCE_MISSING` |
| Root unregistered | any | Remove the unit |
| Team/org ID present in more than one registered root | any | Issue-only unit `DEFINITION_IDENTITY_DUPLICATED` listing the paths |

- One broken file never fails the catalog or removes a working definition. A
  broken `team.md` keeps the team's last good definition while its local agents
  are reconciled on their own.
- Issue codes: `DEFINITION_CONTRACT_INVALID`, `DEFINITION_FAMILY_MISMATCH`,
  `DEFINITION_SOURCE_MISSING`, `DEFINITION_IDENTITY_DUPLICATED`. An issue carries
  `code`, `reason`, `definitionPath` and `packageRoot`.
- Precedence: for agents, the first registered root that has the ID wins, then
  application-owned list sources. A team or org ID must be unique across roots.
  A duplicated team or org is unavailable to **every** reader. It is not
  launchable, not listed, and not offered by `list_available_agents` or `@`.
- Changes are detected by a SHA-256 fingerprint of each node's two definition
  files, so in-app save echoes and unchanged rewrites publish nothing.
- Reads always return copies; callers cannot mutate the stored last good.

The catalog holds no persisted state. Units, last-good copies, issues and watch
status are rebuilt at startup.

## Change Detection And Settle

`PackageDefinitionMonitor` runs in-process chokidar watchers on
`<root>/agents`, `<root>/agent-teams` and `<root>/agent-orgs` for every
registered root, GitHub-managed ones included. A structural allow-list limits
watching to the definition layout:

```
agents/<a>/{agent.md,agent-config.json}
agent-teams/<t>/{team.md,team-config.json}
agent-teams/<t>/agents/<a>/{agent files}
agent-orgs/<o>/{org.md,org-config.json}
agent-orgs/<o>/agents/<a>/{agent files}
agent-orgs/<o>/agent-teams/<t>/{team files | agents/<a>/{agent files}}
```

Skills, docs, scripts, `.git`, `node_modules`, other files and `_`-prefixed
names are not watched. A skill edit is therefore never published; runtime
bootstrap reads skills from disk anyway (see [Skills](./skills.md)).

Each event path is classified into one unit `(subject, unitId)`.
`DefinitionCatalogSync` keeps a pending set and applies it after **1000 ms of
quiet, capped at 3000 ms** from the first pending change. Both constants are
injectable for tests.

**Read-your-writes.** Every service read first calls `settle()`, which applies
pending changes before answering. A definition written by an agent's tool is
therefore visible to the next `delegate_task` or `list_available_agents` as soon
as the monitor has detected the write. In-app saves go through the file
provider and then `reconcileNow`, so they never wait for the watcher.

The reconcile queue is serialized. A per-unit read error becomes an issue and
never fails a batch. An unexpected infrastructure error fails only that batch,
is logged, and leaves its units pending for the next settle.

### Root State

Each registered root has an auto-refresh state, exposed as
`AgentPackage.autoRefresh { state, message }`:

| State | Meaning | Transitions |
| --- | --- | --- |
| `WATCHING` | Changes are detected automatically | Armed when the root exists and its kind folders are readable |
| `ROOT_MISSING` | The root folder does not exist | The monitor watches the nearest existing ancestor and re-arms when the root reappears; units keep last good with `DEFINITION_SOURCE_MISSING` |
| `UNAVAILABLE` | Watching failed: an unreadable kind folder or a watcher error such as `ENOSPC` or `EMFILE` | `message` carries the reason; manual Reload still works; the next registration sync re-arms it |

The monitor records the device and inode of each armed root. A root replaced in
place (the GitHub Update rename swap) is re-armed both from the watch event and
from the full reconcile that Update already runs. Every root state change
publishes `agent_package`.

`autoRefresh` is `null` when no monitor runs (the standalone application host)
or the root is not tracked.

## Population And Full Reconcile

The sync starts unpopulated. The first `settle()` runs one `reloadAll()`, and
concurrent first reads share it. In the studio server the monitor is armed
**before** the startup admission scan, which performs that first settle, so no
change is missed during startup. Startup does not wait for watcher readiness.

`reloadAll()` enumerates every registered root, reconciles every unit, removes
units of unregistered roots, then calls the registration listener
(`monitor.syncRoots()`: start new roots, stop removed ones, re-arm failed or
replaced ones). Triggers:

- the GraphQL refresh mutations (Agents, Teams and Orgs Reload; each service's
  `refreshCache()`);
- package import, removal, local Reload and GitHub Update (`AgentPackageService`
  calls `reloadDefinitionCatalog`; orgs are included);
- application readiness;
- the built-in agent bootstrapper, which writes all built-in agents, then calls
  `refreshCache()` once, then resolves each built-in.

## Admission

`DefinitionAdmissionService.scan()` and `requireAvailable(kind, id)` enumerate
catalog team and org units (issue-only units included) plus the application-owned
team sources from the narrowed `DefinitionSourceRegistry`. Admission's
reference, dependency and handoff validation is unchanged. Duplicate results
come from the readers. A team or org whose package root has gone missing stays
listed and launchable with its last good definition.

## Publication

The sync publishes once per batch, expanding changed subjects so dependent
lists reload:

| Changed subject | Published subjects |
| --- | --- |
| `agent` | `agent`, `agent_team`, `agent_org` |
| `agent_team` | `agent_team`, `agent_org`, `agent` (team-local agents) |
| `agent_org` | `agent_org` |
| root status or registration | adds `agent_package` |

`/ws/definition-catalog` is server-to-client only, uses remote-access websocket
authentication, and sends:

```json
{ "type": "connected" }
{ "type": "definitions_changed", "subjects": ["agent", "agent_team", "agent_org", "agent_package"] }
```

The frame carries subjects only; clients re-read through GraphQL.

## GraphQL Surface

| Field / query | Purpose |
| --- | --- |
| `AgentDefinition.catalogIssue` | Nullable `DefinitionCatalogIssue {code, reason, definitionPath, packageRoot}` on a shared agent served from last good |
| `AgentTeamDefinition.catalogIssues`, `AgentOrgDefinition.catalogIssues` | Every issue in the unit: the root node first, then nested nodes in path order. Type `DefinitionUnitIssue {subject, definitionId, name, code, reason, definitionPath, packageRoot, usingLastGood}`; empty when clean |
| `definitionDiagnostics(subject: AGENT \| AGENT_TEAM \| AGENT_ORG)` | Definitions that cannot be used (issue-only, admission-unavailable with `DEFINITION_REFERENCE_UNRESOLVED` or `DEFINITION_DEPENDENCY_UNAVAILABLE`) plus last-good issues (`usingLastGood: true`), with `dependencyChain` |
| `AgentPackage.autoRefresh` | Root watch state and message |

## Lifecycle And Composition

- `createHostDefinitionServices` builds readers → catalogs → sync → services →
  admission for both the studio server and the standalone application host.
- The studio server adds the hub and the monitor. Shutdown closes the monitor,
  then the hub, then the definition services.

## Ownership Rules

- Definition services are the only public boundary. Callers never touch the
  catalogs, readers, sync or file providers, and never read disk for a
  "fresher" copy.
- The sync is the only catalog writer. The monitor only reports changes and
  never parses definitions.
- Only the readers enumerate package roots. The registry holds only
  application-owned team sources.
- The hub owns fan-out only and imports no definition modules.

## Removed In This Design

These were removed when the catalog was introduced. Do not reintroduce them:

- `CachedAgentDefinitionProvider` and `CachedAgentTeamDefinitionProvider`;
- the fresh path `getFreshAgentDefinitionById` / `getFreshDefinitionById`;
- admission's disk enumeration of shared team/org roots and its decode
  pre-read;
- the registry's `implementationPackageRoots` option;
- GraphQL `definitionAdmissionDiagnostics` (replaced by `definitionDiagnostics`);
- the root-only `catalogIssue` on teams and orgs (replaced by `catalogIssues`).

## Operational Notes

- Linux and Docker: chokidar also watches files, so expect roughly 400–700
  inotify watches for a large package set. A watch limit shows as
  `UNAVAILABLE` on the package row; Reload still works.
- Events lost on sleep or on unusual filesystems are corrected by any full
  reconcile (Reload).
- A run reads its definition when it is created or restored. Running sessions
  keep the definition they started with.

## Related

- [Agent Packages](./agent_packages.md)
- [Agent Definition](./agent_definition.md)
- [AgentTeam Definition](./agent_team_definition.md)
- [AgentOrg](./agent_orgs.md)
- Web: [Agent Management](../../../autobyteus-web/docs/agent_management.md),
  [Settings](../../../autobyteus-web/docs/settings.md#settings-agent-packages-auto-refresh)
