# Agent Definition

## Scope

Defines agent blueprints for shared standalone agents, team-local agents, and application-owned agents. This module owns persisted agent metadata, ownership provenance, and shareable default launch configuration.

## TS Source

- `src/agent-definition`
- `src/api/graphql/types/agent-definition.ts`
- `src/agent-tools/agent-management`
- `src/built-in-agents` (platform-provided built-in agent templates and startup seeding)

## Main Service

- `src/agent-definition/services/agent-definition-service.ts`
- `src/agent-definition/providers/file-agent-definition-provider.ts`

## Ownership Model

| Ownership scope | Backing source shape | Notes |
| --- | --- | --- |
| `SHARED` | `agents/<agent-id>/` | normal standalone agent path |
| `TEAM_LOCAL` | `agent-teams/<team-id>/agents/<agent-id>/` or `applications/<application-id>/agent-teams/<team-id>/agents/<agent-id>/` | surfaced in the generic Agents UI with owning-team provenance and optional owning-application provenance |
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
- application-authored backend orchestration flows that choose to reuse persisted defaults when calling `context.runtimeControl.startRun(...)`.

The generic Applications host no longer launches embedded agents directly at page-load time.

## Built-In Agent Seeds

Backend startup calls the unified built-in-agent bootstrapper in `src/built-in-agents/`. This subsystem owns platform infrastructure agent templates, copies them into the normal runtime agent folder under `<appDataDir>/agents/`, resolves them through `AgentDefinitionService`, and initializes server settings that select infrastructure agents when required.

Built-in templates are centralized under `src/built-in-agents/templates/`:

- `memory-compactor/` seeds the normal shared `agents/autobyteus-memory-compactor/` definition with display name **Memory Compactor**.

The built-in-agent bootstrapper owns this lifecycle:

- missing `agent.md` and `agent-config.json` files are copied from the built-in template registry;
- existing user-edited built-in agent files are preserved by default;
- `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is initialized to `autobyteus-memory-compactor` only when the setting is blank; and
- the agent-definition cache is refreshed after built-in definitions resolve.

Do not add separate one-off built-in-agent bootstrappers or scatter platform templates under feature-runtime folders. Compaction runtime depends on `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; it does not own the Memory Compactor template/seeding lifecycle. Daily Assistant is not a server built-in or server-selected featured default; keep it in a user/private agent package such as `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/daily-assistant/` and feature it through Settings when desired.

## Notes

- Canonical ids encode ownership provenance so callers can resolve application-owned and team-local agents deterministically.
- `AgentDefinitionService` and the file provider remain the authoritative read/write boundary; callers should not reimplement ownership-path resolution.
- Application-owned agents can be edited in place when the owning bundle source is writable.
- Application-owned agents are not created, deleted, or duplicated through the shared standalone provider path.
- `getAllAgentDefinitions()` still uses batched prompt mapping retrieval to avoid N+1 query patterns.
