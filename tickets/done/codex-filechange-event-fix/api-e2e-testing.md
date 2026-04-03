# API / E2E Testing

## Focused Validation Evidence

### Unit
- Command:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
- Result:
  - `5 tests passed`

### Live Codex integration
- Command:
  - `RUN_CODEX_E2E=1 CODEX_THREAD_RAW_EVENT_LOG_DIR=/tmp/codex-raw-event-investigation-fix pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t "converts raw Codex fileChange activity into segment, lifecycle, and artifact events"`
- Result:
  - `1 integration test passed`

### Covered acceptance criteria
- AC1: verified by `SEGMENT_START(edit_file)` + `TOOL_EXECUTION_STARTED(edit_file)` on raw `item/started(fileChange)`
- AC2: verified by `TOOL_EXECUTION_SUCCEEDED(edit_file)` on raw `item/completed(fileChange)`
- AC3: verified by `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` carrying `path` and `type=file`
- AC4: verified by the raw debug log and corrected event names used in the converter
- AC5: satisfied by the focused unit + live integration evidence above

## Re-Entry Validation Note

- `2026-04-02`: an expanded Codex sweep found one failing pre-existing unit suite:
  - `tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`
- Failure shape: the suite still calls `buildProjection(...)` with the obsolete top-level input contract instead of the current `input.source.*` contract.
- Local-fix validation plan:
  1. update that stale unit suite only,
  2. rerun the unit suite,
  3. rerun the broader Codex sweep before returning to Stage 8.

## Re-Entry Validation Evidence

### Repaired unit suite
- Command:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`
- Result:
  - `5 tests passed`

### Live team-roundtrip regression check
- Broader sweep note:
  - one run of the full Codex sweep produced a transient failure in `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- Isolated reruns:
  - `RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime"`
    - `1 test passed`
  - `RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
    - `5 tests passed`

### Validation conclusion
- Deterministic broken coverage from this follow-up is repaired.
- The Codex fileChange converter integration remains green.
- The only additional failure observed during the large all-in-one sweep was a live-test flake that did not reproduce in isolated reruns.


## Full Codex Regression Sweep

### Complete Codex suite rerun
- Command:
  - `RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts tests/integration/runtime-execution/codex-app-server/thread/codex-thread-manager.integration.test.ts tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts tests/integration/runtime-management/codex/client/codex-app-server-client.integration.test.ts tests/integration/services/codex-model-catalog.integration.test.ts tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/codex/events/codex-reasoning-segment-tracker.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/thread/codex-client-thread-router.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts`
- Result:
  - `16 test files passed`
  - `52 tests passed`
- Notes:
  - The suite emitted expected live-runtime warnings from the Codex app server (`plugin warmup 403`, `voice_transcription` feature key, shell snapshot cleanup warnings, long default prompt warnings), but the suite completed successfully with exit code `0`.
  - This sweep includes the earlier targeted fileChange fix coverage and the broader Codex runtime/client/team suites.
