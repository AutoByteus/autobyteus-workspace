# Requirements

**Status:** Draft (v2 — re-opened from Stage 6 after deeper investigation)

## Goal / Problem Statement

Simplify the Prompt persistence model. In real-world usage, the `suitableForModels` attribute adds unnecessary complexity because prompts are not managed per-model; the same prompt is used across all models. The `description` attribute on prompts is also considered redundant. The goal is to remove both `suitableForModels` and `description` from the Prompt model and all related code flows.

## Triage Result

**Medium-to-High** — Although simple conceptually, it impacts 40+ files across: database schema, domain model, converters, repositories, providers (4 files), services (2 files), sync service, agent tools (5 source + 2 formatters + 1 parser state), GraphQL API, frontend GraphQL documents (3 files), frontend stores (2 files), frontend Vue components (6 files, 1 to delete), frontend docs, and 16+ test files.

## In-Scope Use Cases

- **UC-001: Schema Update:** The `Prompt` schema no longer contains `suitableForModels` or `description`, and the unique version constraint is updated.
- **UC-002: Backend API & Domain:** Prompt domain model, converters, repositories, providers, services, and GraphQL APIs are updated to ignore and not return these fields. All fallback logic for `suitableForModels` (like "default") is removed.
- **UC-003: Agent Tools:** Agent tools (create-prompt, update-prompt-metadata, list-prompts) no longer accept or process `suitable_for_models` and `description`. XML formatters and parsing states are updated.
- **UC-004: Sync Service:** Node sync service removes `suitableForModels` and prompt-specific `description` from prompt key hashing and prompt sync state.
- **UC-005: Agent Definition Service:** Prompt fetching in `agent-definition-service.ts` no longer passes `suitableForModels`.
- **UC-006: Frontend Application:** The Web frontend forms, stores, GraphQL queries/mutations, and API queries are updated to not send or request these fields. The CanonicalModelSelector is deleted. PromptCompare model display is removed.

## Acceptance Criteria

- [ ] **AC-001:** `prisma/schema.prisma` is updated. `suitableForModels` and `description` are removed from `Prompt`. `@@unique` changed to `[name, category, version]`.
- [ ] **AC-002:** Prisma database migration is successfully generated and applied.
- [ ] **AC-003:** Domain model (`models.ts`) no longer contains `suitableForModels` or `description`.
- [ ] **AC-004:** Prisma converter (`prisma-converter.ts`) no longer maps these fields.
- [ ] **AC-005:** SQL repository (`prompt-repository.ts`) no longer filters by `suitableForModels`.
- [ ] **AC-006:** All 5 provider files are updated (file, sql, cached, persistence, registry).
- [ ] **AC-007:** `prompt-service.ts` removes both fields from create/update/find/revision options and removes "default" fallback.
- [ ] **AC-008:** `prompt-loader.ts` removes `suitableForModels` defaulting logic.
- [ ] **AC-009:** GraphQL types (`prompt.ts`) remove `suitableForModels` and `description` from all input/output types and resolvers.
- [ ] **AC-010:** `node-sync-service.ts` removes `suitableForModels` and prompt-specific `description` from prompt key, sync state types, and all prompt serialization.
- [ ] **AC-011:** `agent-definition-service.ts` no longer passes `suitableForModels` when fetching prompts.
- [ ] **AC-012:** Agent tools (`create-prompt`, `update-prompt-metadata`, `list-prompts`) remove `description` and `suitable_for_models` args, XML schemas, and formatters.
- [ ] **AC-013:** `xml-create-prompt-tool-parsing-state.ts` removes patterns and capture logic for these fields.
- [ ] **AC-014:** `create-prompt-formatters.ts` removes `description` and `suitable_for_models` from XML template.
- [ ] **AC-015:** Frontend GraphQL documents (3 files) remove these fields from selections/inputs.
- [ ] **AC-016:** Frontend stores (2 files) remove these fields from interfaces and logic.
- [ ] **AC-017:** Frontend Vue components (5 files) remove UI elements, form fields, watchers, and computed properties for these fields.
- [ ] **AC-018:** `CanonicalModelSelector.vue` is **deleted**.
- [ ] **AC-019:** `pnpm run codegen` in `autobyteus-web` succeeds after backend changes.
- [ ] **AC-020:** All backend tests pass (`vitest run`) — 16+ test files updated.
- [ ] **AC-021:** Frontend builds without TypeScript errors.
- [ ] **AC-022:** `autobyteus-web/docs/prompt_engineering.md` updated to remove references to `CanonicalModelSelector`.

## Constraints / Dependencies

- Must ensure that any existing prompts with `suitableForModels` other than "default" (if any) are safely migrated or squashed, but given the current constraints, dropping the column implies a loss of that specific differentiation. The assumption is that this data is not critical.
- Ensure the frontend builds successfully without TypeScript errors.
- `description` field exists on `AgentDefinition` and `Team` models too — those must NOT be touched.

## Assumptions

- There is no business logic actively depending on the content of `suitableForModels` to route requests.
- No legacy systems rely on `suitableForModels` or `description`.

## Open Questions

- None.
