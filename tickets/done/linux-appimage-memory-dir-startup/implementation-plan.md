# Implementation Plan

- Ticket: `linux-appimage-memory-dir-startup`
- Scope Classification: `Small`
- Plan Version: `v1`
- Plan Status: `Finalized` (Stage 6 ready)

## Design Basis (Small-Scope Solution Sketch)

1. Remove import-time memory-root resolution from the team-member projection service.
- Replace the module-scope `teamMemberMemoryLayout` singleton with a lazy helper that resolves `appConfigProvider.config.getMemoryDir()` only when metadata is actually built.

2. Preserve the projection contract introduced by commit `03b8f9a`.
- Keep `memoryDir` on generated `AgentRunMetadata`.
- Only change when the base layout is resolved, not how member paths are computed.

3. Add a regression test for import timing.
- Dynamically import the module with a mocked `appConfigProvider` whose `getMemoryDir()` throws.
- The import itself must succeed, proving no eager lookup occurs during module evaluation.

## Change Inventory

| Change ID | Type | File | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Make team-member memory-layout resolution lazy so AppImage startup honors `--data-dir` before any memory path lookup. |
| C-002 | Add/Modify | `autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.import.test.ts` | Add regression coverage that fails if `getMemoryDir()` is called at import time. |
| C-003 | Modify | `autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.test.ts` | Update or retain existing service behavior coverage as needed after the lazy-resolution change. |

## Verification Strategy (Planned)

- `SCN-001`: Import-time regression check for `team-member-run-view-projection-service.ts`.
- `SCN-002`: Existing unit tests for team-member projection behavior still pass.
- `SCN-003`: Targeted typecheck/test run passes in `autobyteus-server-ts`.

## Go / No-Go Decision

- Decision: `Go`
- Basis: Investigation isolated one precise regression source and git history confirmed the introduction point.
