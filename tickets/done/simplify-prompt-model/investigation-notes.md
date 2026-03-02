# Investigation Notes

## Sources Consulted

Full `grep` / `find` sweep across both `autobyteus-server-ts` and `autobyteus-web` for:

- `suitableForModels` (TypeScript camelCase)
- `suitable_for_models` (snake_case / DB column / agent-tool arg name)
- `description` in prompt-related contexts (excluding unrelated AgentDefinition / Team descriptions)

---

## Complete File Inventory

### 1. Database & Schema

| File                                        | What to change                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `autobyteus-server-ts/prisma/schema.prisma` | Remove `suitableForModels` (line 55) and `description` (line 54) from `Prompt` model. Update `@@unique` constraint (line 59) to `[name, category, version]`. |

### 2. Domain Model

| File                                      | Lines             | What to change                                                                            |
| ----------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `src/prompt-engineering/domain/models.ts` | 6–7, 18–19, 30–31 | Remove `description` and `suitableForModels` from the `Prompt` interface and constructor. |

### 3. Converters

| File                                                    | Lines               | What to change                                                                                           |
| ------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/prompt-engineering/converters/prisma-converter.ts` | 11–12, 26–27, 45–46 | Remove `description` and `suitableForModels` mappings in `toDomain`, `toPrismaCreate`, `toPrismaUpdate`. |

### 4. Repositories

| File                                                           | Lines | What to change                                                                                      |
| -------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| `src/prompt-engineering/repositories/sql/prompt-repository.ts` | 72–76 | Remove `suitableForModels` parameter from `findAllByNameAndCategory` and its use in `where` clause. |

### 5. Providers

| File                                                                | Lines                        | What to change                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/prompt-engineering/providers/file-provider.ts`                 | 15–16, 32–33, 46–47, 122–132 | Remove `description` and `suitableForModels` from `PromptFileRecord` type, `toPrompt`/`toRecord` converters, and `findAllByNameAndCategory` filtering. |
| `src/prompt-engineering/providers/sql-provider.ts`                  | 35, 40                       | Remove `suitableForModels` parameter and its pass-through to repository.                                                                               |
| `src/prompt-engineering/providers/cached-prompt-provider.ts`        | 148, 154–155                 | Remove `suitableForModels` parameter and filtering logic.                                                                                              |
| `src/prompt-engineering/providers/prompt-persistence-provider.ts`   | 47, 49                       | Remove `suitableForModels` parameter from `findAllByNameAndCategory` delegation.                                                                       |
| `src/prompt-engineering/providers/persistence-provider-registry.ts` | 14                           | Remove `suitableForModels` from the interface method signature.                                                                                        |

### 6. Services

| File                                                | Lines                                                                  | What to change                                                                                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/prompt-engineering/services/prompt-service.ts` | 57–58, 65–67, 73, 87–88, 111–112, 143, 146, 148, 173–174, 194–198, 227 | Remove `description` and `suitableForModels` from `createPrompt` options, `addNewRevision` copy, `findAllByNameAndCategory` params, `updatePromptMetadata` options. Remove `"default"` fallback logic. |

### 7. Utils

| File                                            | Lines    | What to change                               |
| ----------------------------------------------- | -------- | -------------------------------------------- |
| `src/prompt-engineering/utils/prompt-loader.ts` | 108, 113 | Remove `suitableForModels` defaulting logic. |

### 8. GraphQL API

| File                              | Lines                                                       | What to change                                                                                                                                                             |
| --------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api/graphql/types/prompt.ts` | 24, 48, 51, 78, 81, 99, 102, 154–155, 229, 246–247, 261–262 | Remove `description` and `suitableForModels` from `Prompt`, `CreatePromptInput`, `UpdatePromptInput`, `AddNewPromptRevisionInput` types, and from resolver field mappings. |

### 9. Sync Service

| File                                     | Lines                                                | What to change                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/sync/services/node-sync-service.ts` | 73–74, 138, 140, 249, 254–255, 448, 464–465, 486–487 | Remove `suitableForModels` and prompt-specific `description` from: `PromptSyncState` type (line 73–74), `promptKey()` hash function (line 138–140), and all prompt serialization/syncing blocks. **Be careful**: `description` on lines 82, 104, 267, 287, 524, 553, 604, 628 belong to `AgentDefinition` and `Team` — do NOT remove those. |

### 10. Agent-Definition Service

| File                                                        | Lines | What to change                                                      |
| ----------------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `src/agent-definition/services/agent-definition-service.ts` | 56    | Remove `suitableForModels` parameter from the prompt-fetching call. |

### 11. Agent Tools (Source)

| File                                                                                | What to change                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/agent-tools/prompt-engineering/create-prompt.ts`                               | Remove `description` (arg def lines 42–44, param line 72, usage line 84) and `suitable_for_models` (arg def lines 50–52, param line 73, usage line 85).                                                                                              |
| `src/agent-tools/prompt-engineering/update-prompt-metadata.ts`                      | Remove `description` (arg def lines 26–28, param line 62, usage line 81, validation line 71/73) and `suitable_for_models` (arg def lines 34–36, param line 63, usage line 82, validation line 71/73). Update validation to only require `is_active`. |
| `src/agent-tools/prompt-engineering/list-prompts.ts`                                | Remove `description` (line 58) and `suitable_for_models` (line 61) from prompt output mapping.                                                                                                                                                       |
| `src/agent-tools/prompt-engineering/states/xml-create-prompt-tool-parsing-state.ts` | Remove `DESCRIPTION_PATTERN` (line 15), `SUITABLE_MODELS_PATTERN` (line 16), and their capture/emit logic (lines 45–46).                                                                                                                             |
| `src/agent-tools/prompt-engineering/formatters/create-prompt-formatters.ts`         | Remove `<arg name="description" ...>` (line 15), `<arg name="suitable_for_models" ...>` (line 16), and example `<arg name="description">` (line 30) from XML template.                                                                               |

### 12. Frontend GraphQL Documents

| File                                                       | What to change                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autobyteus-web/graphql/queries/prompt_queries.ts`         | Remove `description` (lines 11, 30, 45) and `suitableForModels` (lines 12, 31) from all query selections.                                                                                      |
| `autobyteus-web/graphql/mutations/prompt_mutations.ts`     | Remove `description` (lines 11, 29, 48) and `suitableForModels` (lines 12, 30, 49) from all mutation selections.                                                                               |
| `autobyteus-web/graphql/queries/agentDefinitionQueries.ts` | Remove `description` (line 29) and `suitableForModels` (line 30) from the nested `prompts` selection. **Do NOT remove `description` at line 10** — that belongs to the `AgentDefinition` type. |

### 13. Frontend Stores

| File                                                  | What to change                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autobyteus-web/stores/promptStore.ts`                | Remove `description` (lines 14, 128, 135, 161, 171) and `suitableForModels` (lines 15, 129, 135, 171) from the `Prompt` interface, `createPrompt`, and `updatePrompt` functions. |
| `autobyteus-web/stores/promptEngineeringViewStore.ts` | Remove `description` (lines 12, 100, 115, 123, 205, 215) and `suitableForModels` (lines 14, 102, 117, 125–126) from the `PromptDraft` interface and all related logic.           |

### 14. Frontend Vue Components

| File                                                                     | What to change                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autobyteus-web/components/promptEngineering/CreatePromptView.vue`       | Remove description form fields (lines 45–51), `CanonicalModelSelector` usage (line 56), `formData.description` (line 107), `formData.suitableForModels` (line 108), and all related watchers/emit logic (lines 136, 138, 150, 152, 169–170). Remove `CanonicalModelSelector` import (line 97).                                                                                                                                           |
| `autobyteus-web/components/promptEngineering/PromptDetails.vue`          | Remove `CanonicalModelSelector` usage (line 194), model display block (line 196+), description form field (line 211), description display (line 215), `formData.description` (line 311), `formData.suitableForModels` (line 313), related watchers (lines 329, 331, 353–354), `modelList` computed (lines 422–423), and duplicate-finding logic using `suitableForModels` (line 457). Remove `CanonicalModelSelector` import (line 282). |
| `autobyteus-web/components/promptEngineering/PromptCard.vue`             | Remove description display (lines 51–52), `suitableForModels` display (line 63+), type definition fields (lines 93–94), and `models` computed (lines 117–118).                                                                                                                                                                                                                                                                           |
| `autobyteus-web/components/promptEngineering/PromptMarketplace.vue`      | Remove `description` (line 324) and `suitableForModels` (line 325) from type, search filter on description (line 402), and model-grouping logic (lines 427–430).                                                                                                                                                                                                                                                                         |
| `autobyteus-web/components/promptEngineering/PromptCompare.vue`          | Remove `suitableForModels` display and `models` computation (lines 203–204).                                                                                                                                                                                                                                                                                                                                                             |
| `autobyteus-web/components/promptEngineering/CanonicalModelSelector.vue` | **DELETE** this component entirely.                                                                                                                                                                                                                                                                                                                                                                                                      |

### 15. Frontend Generated Types (auto-regenerated)

| File                                  | What to change                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `autobyteus-web/generated/graphql.ts` | Will be auto-regenerated by `pnpm run codegen` after backend GQL schema changes. No manual edit needed. |

### 16. Frontend Documentation

| File                                        | What to change                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `autobyteus-web/docs/prompt_engineering.md` | Remove references to `CanonicalModelSelector` (line 43) and any mentions of `suitableForModels`/`description`. |

---

## Backend Test Files Requiring Updates

### Integration Tests

| File                                                                                      | References                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `tests/integration/prompt-engineering/repositories/prompt-repository.integration.test.ts` | `suitableForModels` throughout                         |
| `tests/integration/prompt-engineering/providers/prompt-provider.integration.test.ts`      | `suitableForModels` at lines 51, 59                    |
| `tests/integration/prompt-engineering/services/prompt-service.integration.test.ts`        | `suitableForModels` + `suitable_for_models` throughout |
| `tests/integration/prompt-engineering/prompt-patching-flow.integration.test.ts`           | Likely references (needs verification)                 |

### E2E Tests

| File                                            | References                                                    |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `tests/e2e/prompts/prompts-graphql.e2e.test.ts` | `suitableForModels` line 69, `description` lines 68, 138, 143 |
| `tests/e2e/sync/node-sync-graphql.e2e.test.ts`  | `suitableForModels` lines 97, 134                             |

### Unit Tests

| File                                                                                            | References                                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `tests/unit/prompt-engineering/cached-prompt-provider.test.ts`                                  | `suitableForModels` lines 13, 22, 31                              |
| `tests/unit/prompt-engineering/prompt-loader.test.ts`                                           | `suitableForModels` line 16, `description` lines 25, 63, 128, 163 |
| `tests/unit/prompt-engineering/prompt-persistence-provider.test.ts`                             | Likely references (needs verification)                            |
| `tests/unit/agent-tools/prompt-engineering/create-prompt.test.ts`                               | `suitable_for_models` line 27, `suitableForModels` line 37        |
| `tests/unit/agent-tools/prompt-engineering/update-prompt-metadata.test.ts`                      | `suitableForModels` line 30                                       |
| `tests/unit/agent-tools/prompt-engineering/list-prompts.test.ts`                                | `suitableForModels` line 27                                       |
| `tests/unit/agent-tools/prompt-engineering/get-prompt.test.ts`                                  | `suitableForModels` line 27                                       |
| `tests/unit/agent-tools/prompt-engineering/activate-prompt.test.ts`                             | `suitableForModels` lines 27, 51                                  |
| `tests/unit/agent-tools/prompt-engineering/update-prompt.test.ts`                               | `suitableForModels` lines 30, 43                                  |
| `tests/unit/agent-tools/prompt-engineering/states/xml-create-prompt-tool-parsing-state.test.ts` | Likely references (needs verification)                            |
| `tests/unit/agent-tools/prompt-engineering/formatters/create-prompt-formatters.test.ts`         | Likely references (needs verification)                            |
| `tests/unit/sync/node-sync-service.test.ts`                                                     | `suitableForModels` lines 16, 26                                  |

---

## What the Previous Investigation Missed

The previous investigation (Stage 1) correctly identified the main code paths but **missed the following files/areas**:

1. **`agent-definition-service.ts`** — passes `suitableForModels` when calling `promptService.findAllByNameAndCategory` (line 56).
2. **`node-sync-service.ts`** — uses `suitableForModels` in its `promptKey()` hash function (line 140) and in 6+ prompt serialization points. Also has prompt-specific `description` in sync state.
3. **`PromptCompare.vue`** — contains `suitableForModels` model list computation (lines 203–204).
4. **`CanonicalModelSelector.vue`** — the component file itself was mentioned to be removed from views but never listed as a file to **DELETE**.
5. **All test files** — the previous investigation mentioned `tests/` generically but never enumerated the 16+ specific test files needing changes.
6. **`prompt-loader.ts`** — has `suitableForModels` defaulting logic.
7. **E2E test files** — `prompts-graphql.e2e.test.ts` and `node-sync-graphql.e2e.test.ts`.
8. **`register-prompt-tool-formatters.ts`** — may need update if it references the removed formatters.
9. **Frontend docs** (`prompt_engineering.md`) — references `CanonicalModelSelector`.

## Triage

- **Scope:** Medium-to-High. 40+ files across database, backend services, GraphQL, agent tools, sync service, frontend components/stores/queries, and 16+ test files.
