# Proposed Design

## Current State
The `Prompt` model in the backend has `suitableForModels` and `description` attributes. These fields are propagated through all persistence layers (SQL, File), GraphQL APIs, and used in the frontend UI. The unique constraint `uq_prompt_version` includes `suitableForModels`.

## Target State
The `Prompt` model is stripped of `suitableForModels` and `description`. All API signatures and internal function signatures drop these parameters. The unique constraint for a prompt version relies only on `[name, category, version]`. The frontend UI removes elements related to these fields.

## Architecture Direction
**Keep** existing architecture and layering. This is a pure refactor/cleanup across all existing layers. No new boundaries or layers are introduced.

## Change Inventory

### Backend (`autobyteus-server-ts`)
| File | Responsibility | Change Type | Notes |
| --- | --- | --- | --- |
| `prisma/schema.prisma` | DB schema | Modify | Remove `suitableForModels` and `description`. Update `@@unique` constraint. |
| `prisma/migrations/*` | Schema history | Add | Generate a new migration for the removed columns. |
| `src/api/graphql/types/prompt.ts` | GQL Schema | Modify | Remove fields from `CreatePromptInput`, `UpdatePromptInput`, and `Prompt`. |
| `src/prompt-engineering/domain/models.ts` | Domain Model | Modify | Remove fields from `Prompt` domain object. |
| `src/prompt-engineering/services/prompt-service.ts` | Business Logic | Modify | Remove fallbacks (like `"default"`), parameters, and field assignments. |
| `src/prompt-engineering/providers/*` | Persistence | Modify | Remove field from `sql-provider`, `file-provider`, `cached-prompt-provider`. |
| `src/prompt-engineering/repositories/sql/prompt-repository.ts` | Data Access | Modify | Remove queries by `suitableForModels`. |
| `src/prompt-engineering/converters/prisma-converter.ts` | Type Mapping | Modify | Stop mapping removed fields. |
| `src/sync/services/node-sync-service.ts` | Synchronization | Modify | Stop mapping/syncing removed fields. |
| `src/agent-tools/prompt-engineering/*` | Agent Tools | Modify | `create-prompt`, `update-prompt-metadata`, `list-prompts` drop removed parameters. |
| `tests/integration/prompt-engineering/*` | Tests | Modify | Remove arguments and assertions for removed fields. |

### Frontend (`autobyteus-web`)
| File | Responsibility | Change Type | Notes |
| --- | --- | --- | --- |
| `graphql/**/*.ts` | Client GQL queries | Modify | Remove `suitableForModels` and `description` from selections and inputs. |
| `stores/promptStore.ts`, `promptEngineeringViewStore.ts` | UI State | Modify | Stop tracking removed fields. |
| `components/promptEngineering/*` | UI Components | Modify | Remove `<CanonicalModelSelector>` and visual elements for `suitableForModels` & `description`. |
| `docs/prompt_engineering.md` | Documentation | Modify | Remove references to these fields. |
| `codegen.ts` output | Typings | Modify | Code generation run to update `generated/graphql.ts`. |

## Naming Decisions
N/A - This task removes fields, no new naming required.

## Dependency Flow
No change to dependencies. The flow remains UI -> GraphQL -> Services -> Providers -> Prisma/File.

## Decoupling Strategy
Maintains current coupling but reduces surface area (simplifying the contract).

## Use-Case Coverage
| Use Case ID | Primary | Fallback | Error | Runtime Model Sections |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | N/A | N/A | |
| UC-002 | Yes | N/A | N/A | |
| UC-003 | Yes | N/A | N/A | |
| UC-004 | Yes | N/A | N/A | |
