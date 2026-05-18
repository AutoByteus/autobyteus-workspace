# Agent Team Definition

## Scope

Defines team blueprints, nested-team graph metadata, ownership provenance, and the authoritative same-bundle integrity rules for application-owned teams.

## TS Source

- `src/agent-team-definition`
- `src/api/graphql/types/agent-team-definition.ts`
- `src/agent-tools/agent-team-management`

## Main Service

- `src/agent-team-definition/services/agent-team-definition-service.ts`
- `src/agent-team-definition/providers/file-agent-team-definition-provider.ts`

## Ownership Model

| Ownership scope | Backing source shape | Notes |
| --- | --- | --- |
| `SHARED` | `agent-teams/<team-id>/` | normal standalone team definition path |
| `TEAM_LOCAL` | `<owner-team>/agent-teams/<local-team-id>/` | parent-owned child team; discovered through its owning team and excluded from root/catalog listing |
| `APPLICATION_OWNED` | `applications/<application-id>/agent-teams/<team-id>/` | surfaced in the generic Agent Teams UI with owning-application / package provenance |

## Member Reference Model

- Team members store `ref`, `refType`, and explicit `refScope`.
- Missing `refScope` is invalid for both `agent` and `agent_team` members in current canonical team configs.
- Agent member `refScope = team_local` means `ref` is a local agent id under the containing team's `agents/<agent-id>/` folder; `refScope = shared` means `ref` is a shared/root agent id.
- Nested team member `refScope = team_local` means `ref` is a local child team id under the containing team's `agent-teams/<local-team-id>/` folder. The domain model resolves that file shape to a canonical team-local team id such as `team-local-team:<encoded-owner-team-id>:<encoded-local-team-id>`.
- Nested team member `refScope = shared` keeps `ref` as a reusable shared/root team id.
- Nested team member `refScope = application_owned` is only valid in an application-owned team context and represents a same-application sibling team. Application-owned package files persist the local sibling id and the loaded domain model canonicalizes it.
- Application-owned teams persist their private agent members as `refScope = team_local` with local agent ids under `applications/<application-id>/agent-teams/<team-id>/agents/<agent-id>/`.
- Application-owned teams use `refScope = team_local` for child teams under the current team and `refScope = application_owned` for sibling teams under the same bundle.

Team-local identity is subject-specific and nested-safe:

- local agent ids use `team-local-agent:<encoded-owner-team-id>:<encoded-local-agent-id>`;
- local team ids use `team-local-team:<encoded-owner-team-id>:<encoded-local-team-id>`;
- callers should use the shared identity helpers rather than manually splitting or constructing id strings.

## Default Launch Preferences

- Team definitions persist optional `defaultLaunchConfig` at the team config layer.
- Shared teams and application-owned teams both parse and write that field through the same shared normalizer.
- Those defaults seed direct team launches and application-authored backend orchestration flows that decide to start a team through `context.runtimeControl.startRun(...)`.

The generic Applications host no longer treats one embedded team as the mandatory launch-time runtime target.

## Authoritative Integrity Rules

- Import-time bundle validation rejects application-owned teams whose members point outside the same owning application bundle.
- Update persistence rechecks the same invariant; frontend filtering is only UX guidance.
- Application-owned team agent members must use `team_local` refs that resolve inside the owning team folder.
- Application-owned nested sibling team refs must use `application_owned`, stay inside the same bundle, and cannot self-reference.
- Parent-owned child team refs must use `team_local` and resolve below the containing team's `agent-teams/` folder.
- Graph validation rejects missing scoped refs, direct self-reference, and cycles across shared, team-local, and application-owned team definitions.
- File-backed discovery returns root shared/application-owned teams for catalog surfaces and recursively discovers team-local subteams with owner-team metadata for detail, runtime, sync, and known-id lookup.

## Notes

- Application-owned teams can be edited in place when the owning bundle source is writable.
- Application-owned teams are not created or deleted through the shared standalone provider path.
- `FileAgentTeamDefinitionProvider.update(...)` is the authoritative backend boundary for persistence-time source-aware integrity checks.
- Read-only versus writable application-owned update boundaries remain source-authoritative; this module does not bypass bundle writability checks.
