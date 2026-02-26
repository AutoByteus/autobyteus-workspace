# Future-State Runtime Call Stack

## Version
v1

## Use Case Coverage
- `UC-01`: Remove deprecated acronym wording from affected tests (primary: Yes, fallback: N/A, error: N/A)
- `UC-02`: Verify no whole-word deprecated-acronym matches remain in `src/` and `tests/` (primary: Yes, fallback: N/A, error: Yes)

## UC-01 Primary Path
1. `tickets/in-progress/provider-wording-cleanup/implementation-plan.md:Task Sequence` defines file-level modify list.
2. `tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts:<multiple tests>` rename descriptions/literals to `AUTOBYTEUS` provider wording.
3. `tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.js:<multiple tests>` update stale env/model assumptions to provider-based context.
4. `tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.js:<multiple tests>` align legacy JS wording/setup with provider-based behavior.
5. Persist modified files to workspace.

## UC-02 Primary Path
1. Execute `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.ts --no-watch`.
2. Execute `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts --no-watch`.
3. Execute `rg -n -i "\\brpa\\b" src tests`.
4. If command returns zero matches, mark acceptance as satisfied.

## UC-02 Error Path
1. If tests fail, classify issue as Local Fix/Design Impact/Requirement Gap.
2. For Local Fix, patch touched tests and re-run verification.
3. For Design Impact or Requirement Gap, update requirements/design artifacts before resuming implementation.
