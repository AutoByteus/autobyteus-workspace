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
| `APPLICATION_OWNED` | `applications/<application-id>/agent-teams/<team-id>/` | surfaced in the generic Agent Teams UI with owning-application / package provenance |

## Member Reference Model

- Team members store `ref`, `refType`, and (for agent members) `refScope`.
- Agent member `refScope` can distinguish shared, team-local, and application-owned agent references.
- Nested team members do not carry `refScope`.
- Application-owned teams persist their private agent members as `refScope = team_local` with local agent ids under `applications/<application-id>/agent-teams/<team-id>/agents/<agent-id>/`.
- Application-owned teams keep nested team refs inside the same bundle, localized in file shape and canonicalized in the loaded domain model.

## Default Launch Preferences

- Team definitions persist optional `defaultLaunchConfig` at the team config layer.
- Shared teams and application-owned teams both parse and write that field through the same shared normalizer.
- Those defaults seed direct team launches and application launches that target the team runtime.

## Authoritative Integrity Rules

- Import-time bundle validation rejects application-owned teams whose members point outside the same owning application bundle.
- Update persistence rechecks the same invariant; frontend filtering is only UX guidance.
- Application-owned team agent members must use `team_local` refs that resolve inside the owning team folder.
- Application-owned nested team refs must stay inside the same bundle and cannot self-reference.

## Notes

- Application-owned teams can be edited in place when the owning bundle source is writable.
- Application-owned teams are not created or deleted through the shared standalone provider path.
- `FileAgentTeamDefinitionProvider.update(...)` is the authoritative backend boundary for persistence-time source-aware integrity checks.
- Read-only versus writable application-owned update boundaries remain source-authoritative; this module does not bypass bundle writability checks.
