# Implementation Plan

## Scope
Remove `suitableForModels` and `description` from the `Prompt` model across the entire stack.

## Phase 1: Database and Backend Schema
1. Modify `autobyteus-server-ts/prisma/schema.prisma`.
2. Generate Prisma migration (`pnpm --filter autobyteus-server-ts dlx prisma migrate dev --name remove_prompt_fields`).
3. Update `autobyteus-server-ts/src/api/graphql/types/prompt.ts`.

## Phase 2: Domain and Persistence
4. Update `autobyteus-server-ts/src/prompt-engineering/domain/models.ts`.
5. Update `autobyteus-server-ts/src/prompt-engineering/converters/prisma-converter.ts`.
6. Update providers in `src/prompt-engineering/providers/` (`file-provider.ts`, `sql-provider.ts`, `cached-prompt-provider.ts`, `prompt-persistence-provider.ts`, `persistence-provider-registry.ts`).
7. Update `autobyteus-server-ts/src/prompt-engineering/utils/prompt-loader.ts`.
8. Update repository in `src/prompt-engineering/repositories/sql/prompt-repository.ts`.
9. Update `autobyteus-server-ts/src/sync/services/node-sync-service.ts`.

## Phase 3: Services and Tools
10. Update `autobyteus-server-ts/src/prompt-engineering/services/prompt-service.ts`.
11. Update `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts`.
12. Update agent tools in `src/agent-tools/prompt-engineering/` (`create-prompt.ts`, `update-prompt-metadata.ts`, `list-prompts.ts`, `activate-prompt.ts`, `states/xml-create-prompt-tool-parsing-state.ts`, `formatters/create-prompt-formatters.ts`).

## Phase 4: Frontend (`autobyteus-web`)
13. Update GraphQL queries/mutations (`graphql/mutations/prompt_mutations.ts`, `graphql/queries/prompt_queries.ts`, `graphql/queries/agentDefinitionQueries.ts`).
14. Update stores (`stores/promptStore.ts`, `stores/promptEngineeringViewStore.ts`).
15. Update components (`PromptDetails.vue`, `CreatePromptView.vue`, `PromptCompare.vue`, `PromptMarketplace.vue`, `PromptCard.vue`).
16. Run `pnpm run codegen` in `autobyteus-web`.

## Phase 5: Testing
17. Fix backend unit/integration tests in `tests/`.
18. Run full test suite for backend and frontend.
