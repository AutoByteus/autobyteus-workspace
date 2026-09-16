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
| Registered external package root | Admitted when supported Team fields and scoped references are valid | Read-only to this repository/process unless that package owner updates it |

Org-owned Team exact reads and their Team-local Agent reads share the indexed
owner/source lookup. An unavailable owner does not fall back to a same-named
shared Team, and exact reads do not populate the public Team cache. See
[Org-owned source resolution](./agent_orgs.md#exact-org-owned-team-and-team-local-agent-reads).

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
`llmModelIdentifier`, and `llmConfig`. Workspace, automatic-tool policy, and
skill access remain run-configuration concerns rather than definition-default
fields.

When a Team is mounted in an AgentOrg, its definition defaults do not silently
override the Org run configuration. Effective Org launch resolution is:

```text
exact Agent placement override -> mounted Team placement override -> Org root
```

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
