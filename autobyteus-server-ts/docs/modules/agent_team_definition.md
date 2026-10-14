# AgentTeam Definition

## Scope

Defines reusable **flat** Team blueprints. A Team contains Agent placements only
and has exactly one direct Agent coordinator. Persistent multi-Team composition
belongs to [AgentOrg](./agent_orgs.md), not to AgentTeam.

## Canonical Definition File

A normal Team definition uses
`agent-teams/<team-definition-id>/team-config.json` with one strict current
shape and **no authored `schemaVersion` field**:

```json
{
  "coordinatorMemberName": "researcher",
  "members": [
    {
      "memberName": "researcher",
      "ref": "researcher",
      "refScope": "team_local"
    }
  ],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

The adjacent `team.md` owns authored name, description, category, and
instructions.

## Member And Coordinator Rules

- Every configured member is an Agent. Team definition member records therefore have no
  `refType`.
- `memberName` is a unique path-safe address segment.
- `ref` identifies the referenced Agent definition.
- `refScope` is explicit and is one of `shared`, `team_local`, or
  `application_owned` when permitted by the owning source.
- `coordinatorMemberName` must resolve to exactly one direct Agent member.
- Team, AgentOrg, missing, ambiguous, cyclic, or unsupported member references
  fail admission. They are never silently flattened.

A Team-local Agent is stored below the Team's `agents/<agent-id>/` directory.
Application-owned Teams may reference valid same-application or Team-local Agent
sources, but they still cannot contain Teams.

## Ownership And Source Boundaries

| Definition source | Catalog behavior | Write boundary |
| --- | --- | --- |
| Shared `agent-teams/<id>/` | Standalone reusable Team | Shared Team provider |
| Application `applications/<app>/agent-teams/<id>/` | Application-owned Team, also inspectable in the Team UI | Owning writable application bundle |
| Org package-owned Team | Exact scoped read, excluded from public Team catalog | Existing Org-owned package authority; no independent write permission inferred |
| Registered agent package root (local folder or GitHub install) | Admitted when supported Team fields and scoped references are valid | Writable like the package's Agents: saves and deletes go into the package folder (source class `registered_package`, owner `package_author`) through the same atomic save, revision check and filesystem check; a later GitHub package update overwrites local edits |

`assertDefinitionSourceWritableByRuntime` lets the app write `server_data` and
`registered_package` sources and refuses only `implementation_repository`
sources. A folder the disk will not write still fails with "… is read-only at
source path …". An Org-owned Team is still changed only through its Org's save.

The atomic save (`collaboration-definition-admission/providers/definition-package-transaction.ts`)
copies the definition folder to a staging folder, writes there, then renames it
into place behind a backup. It copies symlinks verbatim (`verbatimSymlinks: true`),
so relative links inside a package stay relative after a save. The first save
writes the files the app owns in their normalized form. For example, it drops a
legacy `refType` and the trailing newline of `team.md`, so a package checkout
shows a one-time diff. A process whose working directory is inside the swapped
folder is left in the replaced directory.

Org-owned Team exact reads and their Team-local Agent reads share the indexed
owner/source lookup. An unavailable owner does not fall back to a same-named
shared Team, and org-owned Teams never enter the public Team list. See
[Org-owned source resolution](./agent_orgs.md#exact-org-owned-team-and-team-local-agent-reads).

### Agent Package Definitions And Load Issues

Teams from agent packages are served from the
[agent package definitions](./agent_package_definitions.md) as **definition folders**:
the Team plus its Team-local Agents. File edits are detected and applied
automatically. Each definition keeps its last working version when a later edit
is invalid, so a broken Team-local Agent does not make its Team unavailable.

- `AgentTeamDefinition.loadIssues` lists every load issue in the definition
  folder: the Team first, then its Team-local Agents. Each entry has `kind`, `definitionId`,
  `name`, `code`, `reason`, `definitionPath`, `packageRoot` and
  `usingLastGood`. The list is empty when the folder is clean.
- A Team ID present in more than one registered agent package is unusable
  (`DEFINITION_IDENTITY_DUPLICATED`). Every reader treats it as unavailable:
  the Teams list, launch, `list_available_agents` and `@`.
- Admission lists the Team folders plus application-package Team sources.
  Application-package Teams are read on demand for the Team list; a malformed
  one is logged and skipped. `definitionProblems(kind: AGENT_TEAM)` lists the Teams that cannot be
  used and the reason.

Normal Team input readers extract supported root/member/handoff/default fields and
ignore unused metadata, including `schemaVersion` and member `refType`. Missing
or null `defaultLaunchConfig` means no package defaults. Missing or null `avatarUrl` means no image. Other required fields
and supplied value types remain validated; `llmConfig`
retains its provider-specific contents. Actual scoped Agent resolution and
handoff validation still determine availability: nested-Team references do not
become Agents and invalid parents do not suppress valid siblings. Launch still
requires its applicable execution settings.

Canonical saves and package transaction validation remain strict and emit the
current complete internal shape. Normal reads never rewrite source bytes to add
nulls or strip metadata. Neither server-owned nor external authored definitions
are automatically converted by startup migrations; maintainers own any needed
conversion. Ordinary explicit authoring transactions remain supported. See
[AgentOrg runtime migration](./agent_orgs.md#migration-and-external-publication).

## Team-Local Handoffs

`handoffs` is an ordered list of directional guidance records:

```json
{
  "from": "/researcher",
  "to": "/writer",
  "rules": [
    "Send verified evidence when the draft is ready."
  ]
}
```

For a flat Team, both endpoints resolve to direct Agent members of that Team.
`from` is always an Agent. Rules are ordered natural-language conditions, not
executable authorization. Duplicate effective endpoint pairs, direct
self-delivery, invalid addresses, empty rules, and stale references fail the
complete definition update atomically.

Organization-scoped handoffs are authored on AgentOrg. An AgentOrg handoff may
target a mounted Team address; delivery then enters through that Team's direct
coordinator without changing the Team definition.

## Default Launch Preferences

`defaultLaunchConfig` may seed a standalone Team draft with `runtimeKind`,
`llmModelIdentifier`, and `llmConfig`. Workspace and automatic-tool policy
remain run-configuration concerns rather than definition-default fields. Skills
are neither: each member's own agent definition (`skillScope` / `skillNames`)
is the only skill authority, and no Team or run setting changes it.

Each member's own agent default comes before the Team default. The order is the
same wherever a Team is started:

```text
member agent default -> Team default -> starting run (or the launch form's root)
```

- **User start (New chat, mobile, Org launch page).** The web form seeds the
  root from the Team or Org default as before, and seeds every member row, and
  each Org placed Team, from its own usable default. The user can change or
  reset any row before Run. What the form holds at Run is what runs, so the
  server receives ordinary per-member overrides.
- **Delegated copy or collaborator Team.** The server resolves each member by
  the same order, with the run root's settings as the last layer. See
  [Launch configuration of collaborators and catalog copies](./agent_communication.md#launch-configuration-of-collaborators-and-catalog-copies).

The server's effective Org launch resolution is unchanged. A definition default
reaches an Org run only through the rows the launch form seeded:

```text
exact Agent placement override -> mounted Team placement override -> Org root
```

Application launch baselines keep their own order (Team default before agent
default); aligning them is a separate follow-up.

## Runtime Relationship

A standalone Team persists as native Team execution-tree V2 under
`memory/agent_teams/<team-run-id>/`. Its configured root remains flat.
Task delegation may still create task-scoped Team executions beneath a run;
those transient execution relationships are not configured Team membership.

See [Agent Team Execution](./agent_team_execution.md),
[AgentOrg](./agent_orgs.md), and [Run History](./run_history.md).

## TS Source

- `src/agent-team-definition/domain/agent-team-definition.ts`
- `src/agent-team-definition/providers/agent-team-definition-config.ts`
- `src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
- `src/agent-team-definition/services/flat-team-definition-resolver.ts`
- `src/agent-team-definition/services/flat-team-definition-validator.ts`
- `src/api/graphql/types/agent-team-definition.ts`
- `src/agent-tools/agent-team-management`

### Optional Avatar Input

Normal Team reads normalize an omitted avatar to null without writing the source.
A supplied string retains its value; malformed non-null Team values still fail.
Canonical builders and transaction validation retain their complete strict output
contract. Optional images do not relax scoped Agent references, coordinator,
handoffs or launch configuration. No image generation or migration is needed.
