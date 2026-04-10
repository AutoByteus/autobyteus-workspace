# API / E2E / Executable Validation

## Stage 7 Status

- Ticket: `artifact-edit-file-external-path-view-bug`
- Current Status: `Passed`
- Validation Type: `Focused final validation for the backend-owned run-file-changes architecture`

## Scenario Coverage

| Scenario ID | Acceptance Criteria | Command / Method | Result | Notes |
| --- | --- | --- | --- | --- |
| `S7-001` | run-owned file-change projection remains authoritative for active and historical reads | `pnpm exec vitest run tests/unit/services/run-file-changes/run-file-change-service.test.ts tests/unit/api/rest/run-file-changes.test.ts tests/unit/run-history/services/run-file-change-projection-service.test.ts tests/unit/agent-execution/agent-run-manager.test.ts` | Pass | verifies projection ownership, REST content route behavior, run-history reads, and active-run lifecycle wiring |
| `S7-002` | artifact list/viewer state remains correct for streaming, pending, failed, reopen, and active-run merge behavior | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts stores/__tests__/runFileChangesStore.spec.ts components/layout/__tests__/RightSideTabs.spec.ts` | Pass | verifies viewer state handling, artifact list rendering, reopen hydration, merge semantics, and right-side tab wiring |
| `S7-003` | explicit user verification of the original failure case | manual local verification after starting the frontend and backend from the ticket worktree | Pass | user confirmed the ticket is done after the external-path viewer issue stopped reproducing and the transient `400` schema mismatch was resolved |

## Environment Notes

- Focused backend validation passed: `17/17` tests.
- Focused frontend validation passed: `26/26` tests.
- An earlier over-broad backend command (`pnpm test -- --run ...`) was discarded as a release signal because it expanded far beyond the intended scope; the exact focused Vitest rerun above is the authoritative final backend signal.
- Earlier desktop review build outputs remain available from the prior UI review run:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.2.66.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-edit-file-external-path-view-bug/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.2.66.zip`
- Additional signal:
  - `pnpm typecheck` in `autobyteus-server-ts` still fails with repository-wide `TS6059` test/rootDir configuration noise unrelated to this ticket.
