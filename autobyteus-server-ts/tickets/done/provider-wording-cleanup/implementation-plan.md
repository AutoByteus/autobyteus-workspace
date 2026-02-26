# Implementation Plan

## Scope
Small-scope terminology and test-alignment update for deprecated acronym wording.

## Solution Sketch (Design Basis)
- Replace deprecated wording in affected tests with provider-based terminology (`AUTOBYTEUS` / non-`AUTOBYTEUS`).
- Replace stale model identifiers containing the deprecated acronym with neutral identifiers.
- Align stale JS test contexts with provider-based source checks so behavior mirrors current source logic.

## Change Inventory
- Modify: `tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.js`
- Modify: `tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts`
- Modify: `tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.js`

## Task Sequence
1. Update wording and identifiers in TS prompt processor unit tests.
2. Update wording and provider-context setup in JS tool-invocation unit test.
3. Update wording and provider-context setup in JS prompt processor unit test.
4. Run targeted unit tests for touched TS suites.
5. Run grep validation to confirm no whole-word deprecated-acronym matches remain in `src/` and `tests/`.

## Verification Strategy
- Unit: run touched TS test files with Vitest.
- Integration: N/A (no cross-module runtime change).
- E2E: N/A (terminology/test-only cleanup).

## Requirement Traceability
- Req: remove deprecated acronym wording.
  - Design basis: provider terminology replacement and stale JS alignment.
  - Tasks: 1, 2, 3.
  - Verification: task 5 grep validation.
- Req: ensure no regression in touched test behavior.
  - Tasks: 1, 2, 3, 4.
  - Verification: task 4 test run.
