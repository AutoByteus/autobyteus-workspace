# Proposed Design Document

## Summary
Remove prompt synchronization UI behavior from autobyteus-web prompt marketplace by deleting the sync button flow, sync mutation wiring, and sync-result state.

## Goals
- Remove sync trigger from marketplace UI.
- Remove sync GraphQL mutation usage from prompt store.
- Keep prompt browse/edit/create/delete flows operational.

## Non-Goals
- Removing the entire prompt engineering module.
- Removing prompt comparison/versioning workflows.

## Requirements And Use Cases
- Use Case 1: Marketplace header shows reload/create controls only (no sync).
- Use Case 2: Prompt store exposes no sync state or sync action.
- Use Case 3: Build and runtime have no references to `SYNC_PROMPTS` mutation.

## Current State (As-Is)
- `PromptMarketplace.vue` has sync button + sync notification UI.
- `stores/promptStore.ts` defines `syncing`, `syncResult`, `syncPrompts`, and clear helpers.
- `graphql/mutations/prompt_mutations.ts` exports `SYNC_PROMPTS`.

## Target State (To-Be)
- Prompt sync controls/messages removed from marketplace.
- Prompt store has no sync-specific state/actions.
- Prompt mutations file has no sync mutation export.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-web/stores/promptStore.ts` | same | Remove sync state/action/mutation import | Prompt state layer | Keep delete/reload flows |
| C-002 | Modify | `autobyteus-web/components/promptEngineering/PromptMarketplace.vue` | same | Remove sync button and sync-result UI logic | Prompt marketplace UI | Loading state should use existing flags |
| C-003 | Modify | `autobyteus-web/graphql/mutations/prompt_mutations.ts` | same | Remove `SYNC_PROMPTS` export | GraphQL operations | Remove dead query artifact |

## Architecture Overview
UI + store decommission only; prompt domain behavior remains unchanged.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/promptStore.ts` | Modify | Prompt data operations | store actions/getters | GraphQL request/response | apollo client + prompt mutations |
| `autobyteus-web/components/promptEngineering/PromptMarketplace.vue` | Modify | Prompt marketplace presentation | component UI/events | user-triggered actions | prompt store refs/actions |
| `autobyteus-web/graphql/mutations/prompt_mutations.ts` | Modify | Prompt mutation definitions | exported gql constants | GraphQL mutation docs | backend prompt schema |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/promptStore.ts` | mutation constants | prompt marketplace | Medium | Remove store API and update consumer component together |
| `autobyteus-web/components/promptEngineering/PromptMarketplace.vue` | prompt store refs | prompt page | Low | Replace sync references with existing reload-only flow |
| `autobyteus-web/graphql/mutations/prompt_mutations.ts` | none | prompt store | Low | Remove export after store import updated |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Compatibility/Migration Notes | Verification |
| --- | --- | --- | --- |
| Sync button and notification | Remove template/script blocks | Users cannot manually sync prompts anymore | UI smoke test |
| Sync store action/state | Remove state, getter, action, clear helper | No caller should reference removed fields | grep for `syncPrompts`/`syncResult` |
| Sync mutation constant | Remove gql export | No importers should remain | grep for `SYNC_PROMPTS` |

## Data Models (If Needed)
No data model changes.

## Error Handling And Edge Cases
- Ensure loading overlay still behaves without `syncing` flag.
- Ensure no stale timer cleanup references remain.

## Performance / Security Considerations
- Reduced UI/state complexity and one fewer network path.

## Migration / Rollout (If Needed)
Ship with server-ts removal of GraphQL `syncPrompts` mutation.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Typecheck/grep on store symbols | Planned |
| C-002 | T-002 | UI render check + grep | Planned |
| C-003 | T-003 | grep no SYNC_PROMPTS | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-11 | Initial design | None | N/A | Closed |

## Open Questions
- None blocking.
