# API/E2E + Executable Validation — Disable Artifact Auto-Focus

## Scope

This is a frontend component behavior fix. Full browser E2E is not required because the behavior is owned by Vue component watchers and Pinia/composable mocks. Executable validation focuses on component and store/handler tests that cover the affected runtime spine.

## Acceptance Criteria Coverage Matrix

| AC | Scenario | Evidence | Status |
| --- | --- | --- | --- |
| AC1 | Artifact signal while non-Artifacts tab is active must not call `setActiveTab('artifacts')`. | `RightSideTabs.spec.ts` updated regression test | Pass |
| AC2 | Repeated artifact signals must not steal focus/trap user. | `RightSideTabs.spec.ts` repeated-signal regression test | Pass |
| AC3 | Live `FILE_CHANGE` still ingests rows. | `fileChangeHandler.spec.ts`, `runFileChangesStore.spec.ts` | Pass |
| AC4 | Manual Artifacts tab behavior still selects newest artifact inside tab. | `ArtifactsTab.spec.ts` | Pass |
| AC5 | Other tab-switch behavior unaffected by scoped code removal. | Existing `RightSideTabs.spec.ts` plus source diff review | Pass |
| AC6 | Regression tests exist for no-focus-stealing. | `RightSideTabs.spec.ts` | Pass |
| AC7 | Durable docs no longer say auto-focus. | `docs/agent_execution_architecture.md` diff + docs sync | Pass |

## Spine Coverage Matrix

| Spine | Scenario | Evidence | Status |
| --- | --- | --- | --- |
| FS1 | `FILE_CHANGE` updates store but right-side shell does not switch tabs. | `RightSideTabs.spec.ts`, `fileChangeHandler.spec.ts`, `runFileChangesStore.spec.ts` | Pass |
| FS2 | User-opened Artifacts tab can still select newest artifact. | `ArtifactsTab.spec.ts` | Pass |
| FS3 | Non-artifact tab switching logic remains in shell. | Source diff and existing shell test coverage | Pass |

## Execution Results

Command:

```bash
cd autobyteus-web && pnpm exec vitest run \
  components/layout/__tests__/RightSideTabs.spec.ts \
  components/workspace/agent/__tests__/ArtifactsTab.spec.ts \
  services/agentStreaming/handlers/__tests__/fileChangeHandler.spec.ts \
  stores/__tests__/runFileChangesStore.spec.ts
```

Result: Pass.

Summary:

- Test Files: 4 passed
- Tests: 12 passed

Notes:

- Vitest emitted an existing KaTeX quirks-mode warning in component tests; it did not affect results.
- No acceptance criteria required external API, backend, or browser automation validation.

## Gate Decision

Stage 7 executable validation: Pass.
