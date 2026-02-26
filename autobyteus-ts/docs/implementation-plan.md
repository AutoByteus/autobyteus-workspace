# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Change is localized to search provider layer and docs/tests.
  - No schema/storage changes.
  - Existing `search_web` tool API remains unchanged.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> runtime simulation -> refine same plan until simulation-validated -> progress tracking.

## Plan Maturity

- Current Status: `Simulation-Validated`
- Notes:
  - Runtime simulation completed in `docs/simulated-runtime-call-stack.md`.
  - Primary and error branches are covered for all in-scope use cases.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Select Vertex AI Search explicitly with `DEFAULT_SEARCH_PROVIDER=vertex_ai_search`.
  - Auto-fallback to Vertex AI Search when Serper/SerpApi are not configured.
  - Return structured result text from Vertex AI Search response.
  - Preserve existing providers (`serper`, `serpapi`) and remove deprecated `google_cse`.
- Touched Files/Modules:
  - `src/tools/search/providers.ts`
  - `src/tools/search/providers.js`
  - `src/tools/search/vertex-ai-search-strategy.ts`
  - `src/tools/search/vertex-ai-search-strategy.js`
  - `src/tools/search/factory.ts`
  - `src/tools/search/factory.js`
  - `tests/unit/tools/search/providers.test.ts`
  - `tests/integration/tools/search/providers.test.ts`
  - `tests/unit/tools/search/factory.test.ts`
  - `tests/unit/tools/search/vertex-ai-search-strategy.test.ts`
  - `tests/integration/tools/search/vertex-ai-search-strategy.test.ts`
  - `examples/README.md`
  - `examples/run-deep-research-agent.ts`
- API/Behavior Delta:
  - New provider enum value: `vertex_ai_search`.
  - New env vars:
    - `VERTEX_AI_SEARCH_API_KEY`
    - `VERTEX_AI_SEARCH_SERVING_CONFIG`
  - New fallback branch in search factory.
- Key Assumptions:
  - Vertex Search app/engine/serving config already exists in Google Cloud.
  - `searchLite` endpoint accepts API key for public website search.
- Known Risks:
  - Vertex response fields can vary by engine/content type; formatter must tolerate sparse fields.
  - Misconfigured serving config path can cause 4xx errors.

## Use Case Simulation Gate (Required Before Implementation)

| Use Case | Simulation Location | Primary Path Covered | Fallback/Error Covered (If Relevant) | Gaps | Status |
| --- | --- | --- | --- | --- | --- |
| Explicit vertex provider execution | `docs/simulated-runtime-call-stack.md` | Yes | Yes | None | Passed |
| Factory fallback to vertex provider | `docs/simulated-runtime-call-stack.md` | Yes | Yes | None | Passed |
| Vertex upstream failure propagation | `docs/simulated-runtime-call-stack.md` | Yes | Yes | None | Passed |

## Simulation Cleanliness Checklist (Pre-Implementation Review)

| Check | Result | Notes |
| --- | --- | --- |
| Use case is fully achievable end-to-end | Pass | Input config -> factory -> strategy -> HTTP -> formatter validated in simulation. |
| Separation of concerns is clean per file/module | Pass | Factory selection logic separate from provider transport/formatting. |
| Boundaries and API ownership are clear | Pass | `SearchClientFactory` owns selection; strategy owns API specifics. |
| Dependency flow is reasonable (no accidental cycle/leaky cross-reference) | Pass | New strategy only depends on base strategy + axios. |
| No major structure/design smell in call stack | Pass | No cross-module cycles introduced. |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan and re-simulate.

## Principles

- Bottom-up: provider enum/strategy first, then factory, then docs/tests.
- Test-driven: add provider/strategy unit coverage and env-gated integration coverage.
- One file at a time by dependency order.
- Update progress after each meaningful status change.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/tools/search/providers.ts` + `src/tools/search/providers.js` | N/A | Enum value needed by factory/tests. |
| 2 | `src/tools/search/vertex-ai-search-strategy.ts` + `.js` | `base-strategy` | Core provider implementation. |
| 3 | `src/tools/search/factory.ts` + `.js` | providers + vertex strategy | Wire provider selection/fallback. |
| 4 | Unit/integration tests | updated source files | Validate behavior and prevent regressions. |
| 5 | Example docs/messages | provider/env contract | Keep user guidance aligned. |

## Step-By-Step Plan

1. Add `vertex_ai_search` enum and Vertex strategy implementation.
2. Wire factory explicit and fallback selection for Vertex config.
3. Add/adjust unit + integration tests for provider/factory/strategy.
4. Update example setup docs/error messaging.
5. Run targeted tests and update progress artifact.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `src/tools/search/providers.ts` + `.js` | Includes `VERTEX_AI_SEARCH` enum value | Provider enum tests include value | Integration provider enum test includes value | Backward compatible existing values unchanged |
| `src/tools/search/vertex-ai-search-strategy.ts` + `.js` | Uses env config, calls `searchLite`, formats output, handles errors | New unit test covers formatting/success/non-200 | Env-gated live integration test for real call | API key auth path only |
| `src/tools/search/factory.ts` + `.js` | Selects vertex explicitly and via fallback | Factory unit tests cover explicit + fallback | Existing integration factory tests still pass | Preserve existing provider precedence where appropriate |
| `examples/README.md` | Mentions vertex provider env vars | N/A | N/A | User guidance only |
| `examples/run-deep-research-agent.ts` | Error hint includes vertex vars | N/A | N/A | Runtime UX only |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None identified | N/A | N/A | Proceed with implementation | Completed |

## Test Strategy

- Unit tests:
  - `tests/unit/tools/search/providers.test.ts`
  - `tests/unit/tools/search/factory.test.ts`
  - `tests/unit/tools/search/vertex-ai-search-strategy.test.ts`
- Integration tests:
  - `tests/integration/tools/search/providers.test.ts`
  - `tests/integration/tools/search/factory.test.ts`
  - `tests/integration/tools/search/vertex-ai-search-strategy.test.ts` (env-gated live)
- Test data / fixtures:
  - Mocked axios payloads for unit tests.
  - Real env vars for optional live integration (`VERTEX_AI_SEARCH_API_KEY`, `VERTEX_AI_SEARCH_SERVING_CONFIG`).
