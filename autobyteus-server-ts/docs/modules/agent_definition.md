# Agent Definition

## Scope

Defines agent blueprints for shared standalone agents, team-local agents, and application-owned agents. This module owns persisted agent metadata, ownership provenance, and shareable default launch configuration.

## TS Source

- `src/agent-definition`
- `src/api/graphql/types/agent-definition.ts`
- `src/agent-tools/agent-management`

## Main Service

- `src/agent-definition/services/agent-definition-service.ts`
- `src/agent-definition/providers/file-agent-definition-provider.ts`

## Ownership Model

| Ownership scope | Backing source shape | Notes |
| --- | --- | --- |
| `SHARED` | `agents/<agent-id>/` | normal standalone agent path |
| `TEAM_LOCAL` | `agent-teams/<team-id>/agents/<agent-id>/` | surfaced in the generic Agents UI with owning-team provenance |
| `APPLICATION_OWNED` | `applications/<application-id>/agents/<agent-id>/` | surfaced in the generic Agents UI with owning-application / package provenance |

## Default Launch Config

Agent definitions now persist `defaultLaunchConfig` alongside the rest of the definition metadata.

`defaultLaunchConfig` contains:

- `llmModelIdentifier`
- `runtimeKind`
- `llmConfig`

These defaults are consumed by:

- the native agent create/edit/detail surfaces,
- direct agent launch preparation, and
- application launch preparation when an application binds directly to an embedded agent.

Team-targeted application launches use the team definition's own `defaultLaunchConfig` instead of aggregating leaf agent defaults upward.

## Notes

- Canonical ids encode ownership provenance so callers can resolve application-owned and team-local agents deterministically.
- `AgentDefinitionService` and the file provider remain the authoritative read/write boundary; callers should not reimplement ownership-path resolution.
- Application-owned agents can be edited in place when the owning bundle source is writable.
- Application-owned agents are not created, deleted, or duplicated through the shared standalone provider path.
- `getAllAgentDefinitions()` still uses batched prompt mapping retrieval to avoid N+1 query patterns.
