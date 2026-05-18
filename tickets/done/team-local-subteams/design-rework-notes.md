# Design Rework Notes

## Rework Trigger

Architecture review round 1 failed the initial design with design-impact findings:

- AR-001: The design did not explicitly cover the agent-definition lookup/list/cache path for local agents owned by team-local subteams.
- AR-002: The design under-specified `application_owned` nested-team `refScope` semantics versus `team_local` child subteams.

User clarification after review: in this layout,

```text
applications/my-app/
  agent-teams/
    main-team/
      agent-teams/
        drafting-cell/
```

`main-team` is application-owned and `drafting-cell` is team-local to `main-team`. A sibling application team under `applications/my-app/agent-teams/<other-team>/` should be referenced as `refScope: "application_owned"`, not `team_local`.

## AR-001 Rework Resolution

The revised design now makes the agent-definition path an in-scope governing subsystem:

- Adds DS-006 for local-agent canonical ID -> agent source resolver -> GraphQL/store lookup.
- Adds an explicit `Agent-Definition Local-Agent Resolution Path (AR-001)` section.
- Requires `agent-definition-source-paths.ts` to parse generalized local-agent IDs and resolve owner team source paths through `findTeamSourcePaths()`.
- Requires `team-local-agent-discovery.ts` to walk shared root teams, application-owned top-level teams, and recursively discovered team-local subteams via a shared team-source context helper.
- Requires `file-agent-definition-provider.ts` to update read/list/create/update/delete owner resolution.
- Requires `cached-agent-definition-provider.ts` to bypass/exclude generalized local-agent IDs.
- Requires GraphQL and `autobyteus-web/stores/agentDefinitionStore.ts` to expose/find local subteam-owned local agents by canonical local-subteam `ownerTeamId`.
- Adds acceptance tests for ID resolution, visible listing, cache bypass, frontend store lookup, runtime topology, and sync dependency closure.

## AR-002 Rework Resolution

The revised design now defines clean application-owned semantics:

- Adds DS-007 for application-owned persisted config -> normalizer -> validator -> writer localization.
- Adds a `Scoped Resolution Context Contract` so resolution uses containing team ID, source paths, ownership scope, and owner app/package metadata instead of a thin `ownerTeamId + member` input.
- Defines `application_owned` as a same-application sibling resource scope and `team_local` as a child resource under the containing team.
- States clean-cut rejection of missing/null `refScope` for app-owned nested team refs because application-owned is not production-enabled.
- Requires `application-owned-team-source.ts`, `application-owned-team-ref-normalizer.ts`, `application-owned-team-integrity-validator.ts`, and `file-application-bundle-provider.ts` updates.
- Adds test coverage for app-owned sibling canonicalize/localize, app-owned parent with child team-local subteam, and missing-scope rejection.

## Updated Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/design-spec.md`
- Round 1 design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/design-review-report.md`
- This rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/tickets/in-progress/team-local-subteams/design-rework-notes.md`
