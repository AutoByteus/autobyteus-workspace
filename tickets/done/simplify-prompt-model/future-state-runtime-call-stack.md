# Future-State Runtime Call Stack

## Use Case 1: Backend API / GraphQL Mutation (UC-002)
**Source:** Requirement AC-003
**Coverage:** Primary

[ENTRY] autobyteus-server-ts/src/api/graphql/types/prompt.ts:PromptResolver
├── createPrompt(name, category, promptContent) // no description/suitableForModels
│   ├── src/prompt-engineering/services/prompt-service.ts:PromptService.createPrompt(...)
│   │   ├── src/prompt-engineering/providers/persistence-proxy.ts:createPrompt(...)
│   │   │   └── sql-provider.ts / file-provider.ts (persists only core fields)
│   │   └── return Prompt (without description/suitableForModels)
└── return GraphQL Object

## Use Case 2: Frontend Prompt Loading (UC-004)
**Source:** Requirement AC-008
**Coverage:** Primary

[ENTRY] autobyteus-web/components/promptEngineering/PromptDetails.vue
├── fetch prompt via GraphQL `getPromptById`
│   └── query omits `description` and `suitableForModels`
├── update local reactive state (pinia promptStore / promptEngineeringViewStore)
│   └── state types do not include `suitableForModels` or `description`
└── render view
    └── CanonicalModelSelector is not rendered.

## Use Case 3: Agent Tool `create-prompt` (UC-003)
**Source:** Requirement AC-005
**Coverage:** Primary

[ENTRY] autobyteus-server-ts/src/agent-tools/prompt-engineering/create-prompt.ts:execute(...)
├── parse arguments (name, category, promptContent, is_active) // suitable_for_models and description removed
├── src/prompt-engineering/services/prompt-service.ts:PromptService.createPrompt(...)
└── return formatted result text.
