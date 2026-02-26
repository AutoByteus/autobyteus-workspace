# Agent Definition

## Scope

Defines agent blueprints, prompt mapping metadata, and processor/tool defaults.

## TS Source

- `src/agent-definition`
- `src/api/graphql/types/agent-definition.ts`
- `src/agent-tools/agent-management`

## Main Service

- `src/agent-definition/services/agent-definition-service.ts`

## Notes

`getAllAgentDefinitions()` uses batched prompt mapping retrieval to avoid N+1 query patterns.
