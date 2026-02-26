# Implementation Plan (Bottom-Up TDD)

## Strategy
Implement lowest-level dependencies first (models, store, transformers), validate with unit tests, then services, then GraphQL converters/types/resolvers, then end-to-end GraphQL tests.

## Steps
1. Add domain models under `src/agent-memory-view/models/`.
2. Implement file store `src/agent-memory-view/store/memory-file-store.ts` with JSON/JSONL parsing and safe error handling.
3. Implement transformer `src/agent-memory-view/transformers/raw-trace-to-conversation.ts`.
4. Implement services:
   - `agent-memory-view-service.ts`
   - `agent-memory-index-service.ts`
5. Add GraphQL types/resolvers:
   - `src/api/graphql/types/memory-view.ts`
   - `src/api/graphql/types/memory-index.ts`
6. Add GraphQL converters:
   - `src/api/graphql/converters/memory-view-converter.ts`
   - `src/api/graphql/converters/memory-index-converter.ts`
7. Wire resolvers in `src/api/graphql/schema.ts`.
8. Add unit tests for store, transformer, services, converters, types.
9. Add GraphQL e2e tests for `getAgentMemoryView` and `listAgentMemorySnapshots`.

## Test Strategy
- Unit tests use temp directories and fixture data.
- E2E tests build GraphQL schema and execute queries with `graphql` function.
