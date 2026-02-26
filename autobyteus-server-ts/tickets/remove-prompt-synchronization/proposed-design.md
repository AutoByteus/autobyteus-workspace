# Proposed Design Document

## Summary
Remove prompt synchronization behavior from autobyteus-server-ts by decommissioning startup sync wiring and GraphQL manual sync mutation while preserving local prompt management.

## Goals
- Disable automatic prompt sync background task on startup.
- Remove manual `syncPrompts` GraphQL mutation.
- Remove server-setting metadata tied only to startup prompt sync.

## Non-Goals
- Removing local prompt CRUD/query features.
- Deleting prompt sync service implementation files in this iteration.

## Requirements And Use Cases
- Use Case 1: Startup background tasks must not include prompt sync.
- Use Case 2: GraphQL schema must no longer expose `syncPrompts` mutation.
- Use Case 3: Existing prompt CRUD/query operations remain intact.

## Current State (As-Is)
- Startup scheduler loads `runPromptSynchronization` from `src/startup/prompt-sync.ts`.
- Prompt resolver exposes `syncPrompts` mutation.
- Server settings metadata includes `AUTOBYTEUS_PROMPT_SYNC_ON_STARTUP`.

## Target State (To-Be)
- Startup scheduler excludes prompt synchronization.
- Prompt resolver has no manual sync mutation and no sync response type.
- Server settings metadata no longer advertises prompt-sync-on-startup key.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/startup/background-runner.ts` | same | Remove prompt-sync task registration | Startup flow | Startup no longer triggers sync |
| C-002 | Modify | `autobyteus-server-ts/src/startup/index.ts` | same | Remove prompt-sync export | Startup module surface | Keep exports aligned with active tasks |
| C-003 | Remove | `autobyteus-server-ts/src/startup/prompt-sync.ts` | removed | Remove obsolete startup entrypoint | Startup module files | Service remains but unused |
| C-004 | Modify | `autobyteus-server-ts/src/api/graphql/types/prompt.ts` | same | Remove `syncPrompts` mutation and sync service import | GraphQL mutation schema | Keep other prompt mutations |
| C-005 | Modify | `autobyteus-server-ts/src/services/server-settings-service.ts` | same | Remove sync setting description entry | Server settings metadata | No behavior dependency |

## Architecture Overview
Decommission synchronization entrypoints only; local prompt domain/services stay intact.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/startup/background-runner.ts` | Modify | Background task registry | `scheduleBackgroundTasks` | task list | dynamic imports |
| `autobyteus-server-ts/src/startup/index.ts` | Modify | Startup exports | startup module API | exported startup functions | startup files |
| `autobyteus-server-ts/src/startup/prompt-sync.ts` | Remove | Startup prompt sync runner | `runPromptSynchronization` | sync side effects | prompt sync service |
| `autobyteus-server-ts/src/api/graphql/types/prompt.ts` | Modify | Prompt GraphQL resolver/types | Prompt mutations/queries | GraphQL schema fields | prompt service + sync service |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Modify | Setting descriptions | available settings metadata | key/description pairs | config provider |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/prompt.ts` | prompt sync service import | web clients using sync mutation | Medium | Remove mutation and corresponding frontend call in autobyteus-web |
| `autobyteus-server-ts/src/startup/background-runner.ts` | startup prompt-sync module | startup scheduler | Low | Remove single task-spec entry |
| `autobyteus-server-ts/src/startup/index.ts` | prompt-sync module export | imports from startup barrel | Low | Remove matching export and run grep |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Compatibility/Migration Notes | Verification |
| --- | --- | --- | --- |
| Startup prompt sync task | Remove task registration and file | Startup no longer syncs from marketplace | Startup log/manual run |
| GraphQL sync mutation | Remove mutation method and type | Clients must stop calling syncPrompts | GraphQL schema/build smoke |
| Sync setting description | Remove metadata row | Existing env var ignored if present | Settings query smoke |

## Data Models (If Needed)
No data model changes.

## Error Handling And Edge Cases
- Ensure resolver compiles after removing sync-related type/import.
- Ensure background runner still has valid task list and imports.

## Performance / Security Considerations
- Smaller startup work and reduced external network dependency surface.

## Migration / Rollout (If Needed)
Deploy server changes together with autobyteus-web sync-button removal.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Startup module static checks | Planned |
| C-002 | T-002 | Startup export grep | Planned |
| C-003 | T-003 | File removal + no missing import | Planned |
| C-004 | T-004 | GraphQL schema/typecheck | Planned |
| C-005 | T-005 | Settings service compile | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-11 | Initial design | None | N/A | Closed |

## Open Questions
- None blocking.
