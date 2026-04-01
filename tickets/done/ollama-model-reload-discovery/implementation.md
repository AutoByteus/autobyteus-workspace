# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: The confirmed bug is a localized provider-classification mismatch in the shared Ollama discovery path plus targeted regression coverage.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/ollama-model-reload-discovery/workflow-state.md`
- Investigation notes: `tickets/done/ollama-model-reload-discovery/investigation-notes.md`
- Requirements: `tickets/done/ollama-model-reload-discovery/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/ollama-model-reload-discovery/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/ollama-model-reload-discovery/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Review-Gate-Validated`
- Notes: Stage 6 implementation completed without further source edits after re-entry; the post-validation failure was traced to a contaminated worktree dependency graph, and clean-worktree validation now confirms the existing source fix.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001`: Targeted Ollama provider reload keeps discovered local models in the `OLLAMA` bucket.
  - `UC-002`: Post-reload grouped-provider query returns discovered Ollama models under the `OLLAMA` provider card.
  - `UC-003`: LM Studio local-runtime grouping remains unchanged.
- Spine Inventory In Scope:
  - `DS-001`: Ollama local-runtime discovery and registration spine
  - `DS-002`: Grouped-provider listing spine for the settings UI
  - `DS-003`: LM Studio local-runtime regression spine
- Primary Owners / Main Domain Subjects:
  - `autobyteus-ts/src/llm/ollama-provider.ts` remains the authoritative owner of Ollama discovery semantics.
  - Existing server/UI grouped-provider flows remain consumers, not owners, of the provider classification rule.
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001` -> `UC-001`
  - `R-002` -> `UC-001`, `UC-002`
  - `R-003` -> `UC-003`
  - `R-004` -> `UC-001`, `UC-002`
- Design-Risk Use Cases:
  - None beyond regression coverage for local runtime grouping.
- Target Architecture Shape:
  - Preserve runtime/provider-card identity for Ollama-hosted local models by registering them with `LLMProvider.OLLAMA`.
  - Keep vendor-specific information derived from the model name out of the provider-card grouping path.
  - Verify the behavior through shared-runtime reload tests and at least one grouped-provider/server-facing assertion if current coverage does not already prove it.
- New Owners/Boundary Interfaces To Introduce:
  - None
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - The `provider` field for Ollama-hosted local models becomes stable as `OLLAMA` in the provider-card/reload flow.
  - `runtime` remains `ollama`, and `modelIdentifier` still carries the local runtime host.
- Key Assumptions:
  - No downstream feature requires Ollama-hosted models to masquerade as vendor API providers through the `provider` field.
  - Existing local-runtime selection can rely on `runtime`, `modelIdentifier`, and `llmClass`, not vendor-family `provider`.
- Known Risks:
  - Any untested downstream path that used `model.provider === QWEN` for Ollama-hosted models could change behavior.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: fix shared discovery semantics before depending on server/UI grouped-provider behavior.
- Test-driven: add or extend focused automated tests for the specific reload/grouping mismatch.
- Spine-led implementation rule: change the owning discovery spine first, then prove its grouped-provider effects.
- Mandatory modernization rule: no compatibility shim that dual-writes both `OLLAMA` and vendor-family buckets.
- Mandatory cleanup rule: no stale fallback classification branch should remain in the touched path if it preserves the buggy provider-bucket behavior.
- Mandatory ownership/decoupling/SoC rule: keep the classification rule inside the owning Ollama discovery file and avoid scattering runtime-specific grouping hacks into the UI.

### Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | Ollama discovery | `autobyteus-ts/src/llm/ollama-provider.ts` | Review approval | Fix the owning classification behavior first |
| 2 | DS-001, DS-002 | Shared-runtime tests | `autobyteus-ts/tests/...` | 1 | Prove targeted reload now populates the `OLLAMA` bucket |
| 3 | DS-002 | Server-facing/grouped-provider coverage if needed | `autobyteus-server-ts/tests/...` | 1 | Lock the grouped-provider contract if current tests do not already cover it |
| 4 | DS-003 | LM Studio regression | Existing touched tests | 1 | Confirm the narrow fix does not affect LM Studio grouping |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Ollama discovery rule | `autobyteus-ts/src/llm/ollama-provider.ts` | same | Shared TS LLM local-runtime discovery | Keep | Unit/integration tests |
| Ollama reload regression coverage | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` and/or new nearby test | same/new nearby test | Shared TS LLM reload behavior | Keep/Create | Vitest |
| Grouped-provider contract coverage | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` if needed | same | Server GraphQL provider grouping | Keep/Modify | Vitest |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | Shared TS LLM runtime | Preserve Ollama runtime/provider-card identity during discovery | `autobyteus-ts/src/llm/ollama-provider.ts` | same | Modify | Stage 5 `Go` | Completed | `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | Passed | Passed | Aligned Ollama registration behavior with LM Studio by keeping discovered models under `LLMProvider.OLLAMA`; removed obsolete resolver file |
| `C-002` | `DS-001`, `DS-002` | Shared TS LLM runtime tests | Catch reload-count vs provider-bucket mismatch | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | same | Modify | `C-001` | Completed | `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | Passed | Passed | Added regression that would fail on the old `qwen -> QWEN` mis-registration bug |
| `C-003` | `DS-002`, `DS-003` | Server/provider grouping tests | Prove grouped-provider results and LM Studio non-regression if current coverage is missing | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | same | Modify | `C-001` | Completed | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | Passed | `N/A` | N/A | Passed | Added grouped-provider resolver assertion that `OLLAMA` receives the local model and `QWEN` stays empty |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | Solution Sketch | `UC-001` | `C-001`, `C-002` | Unit/Integration | `AV-001` |
| `R-002` | `AC-002` | `DS-001`, `DS-002` | Solution Sketch | `UC-001`, `UC-002` | `C-001`, `C-002`, `C-003` | Integration | `AV-001`, `AV-002` |
| `R-003` | `AC-003` | `DS-003` | Solution Sketch | `UC-003` | `C-003` | Unit/Integration | `AV-003` |
| `R-004` | `AC-004` | `DS-001`, `DS-002` | Solution Sketch | `UC-001`, `UC-002` | `C-002`, `C-003` | Unit/Integration | `AV-001`, `AV-002` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | Ollama discovery keeps local models under `OLLAMA` | `AV-001` | API | Planned |
| `AC-002` | `R-002` | `DS-001`, `DS-002` | Targeted reload plus grouped-provider results show non-empty `OLLAMA` | `AV-001`, `AV-002` | API | Planned |
| `AC-003` | `R-003` | `DS-003` | LM Studio grouping remains unchanged | `AV-003` | API | Planned |
| `AC-004` | `R-004` | `DS-001`, `DS-002` | Regression test fails if reload count and provider bucket diverge | `AV-001`, `AV-002` | API | Planned |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | Name-based vendor reclassification inside the Ollama provider path | Remove | Delete the resolver dependency from the Ollama discovery path if it becomes unused there | Verify no downstream caller still expects the old provider reassignment |

### Step-By-Step Plan

1. Change Ollama discovery so local runtime models are registered as `LLMProvider.OLLAMA`.
2. Add regression coverage proving targeted Ollama reload repopulates the `OLLAMA` bucket and would fail on the old behavior.
3. Add grouped-provider/server-facing or LM Studio regression coverage if existing tests do not already close those acceptance criteria.
4. Run targeted tests plus a live local-runtime repro command in the worktree.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/ollama-model-reload-discovery/code-review.md`
- Scope (source + tests): Ollama provider discovery plus directly related reload/grouping regression tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - No touched source file is expected to approach the limit
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - Keep edits localized; if any file approaches the threshold, split test additions from production logic
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - Not expected to trigger
- file-placement review approach (how wrong-folder placements will be detected and corrected):
  - Keep the runtime classification fix in `autobyteus-ts/src/llm` and avoid UI workarounds

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/ollama-provider.ts` | Small | Yes | Low | Keep | Local Fix |
| `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | Moderate | Yes | Low | Keep | Validation Gap |

### Test Strategy

- Unit tests:
  - Ollama discovery assigns `LLMProvider.OLLAMA` even for vendor-keyword model names
- Integration tests:
  - Reloading `LLMProvider.OLLAMA` repopulates the `OLLAMA` bucket instead of a vendor-family bucket
  - LM Studio reload behavior remains unchanged
- Stage 6 boundary: shared-runtime source and targeted unit/integration verification only
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/ollama-model-reload-discovery/api-e2e-testing.md`
  - expected acceptance criteria count: `4`
  - critical flows to validate:
    - targeted provider reload
    - grouped-provider visibility
    - LM Studio regression
  - expected scenario count: `3`
  - known environment constraints:
    - Local Ollama and LM Studio services should remain reachable for live repro
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/done/ollama-model-reload-discovery/code-review.md`
  - predicted design-impact hotspots:
    - downstream assumptions about vendor-family `provider` on Ollama runtime models
  - predicted file-placement hotspots:
    - avoid moving the fix into server/UI grouping layers
  - predicted interface/API/query/command/service-method boundary hotspots:
    - none beyond preserving the existing provider-group contract
  - files likely to exceed size/ownership/SoC thresholds:
    - none

## Execution Tracking (Update Continuously)

### Current Execution Status

- Current Phase: `Completed`
- Active Change ID: `None`
- Notes: Stage 6 source implementation remains complete; re-entry investigation confirmed the live validation discrepancy came from borrowed `node_modules`, not from a remaining product-code bug in the patched worktree.

### Execution Log

| Date | Change ID | Status Update | Verification / Evidence |
| --- | --- | --- | --- |
| 2026-04-01 | `N/A` | Implementation baseline finalized after Stage 5 `Go Confirmed` | `implementation.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md` |
| 2026-04-01 | `C-001` | Updated Ollama discovery to keep local models in the `OLLAMA` bucket; removed obsolete resolver file | `autobyteus-ts/src/llm/ollama-provider.ts`, `autobyteus-ts/src/llm/ollama-provider-resolver.ts` |
| 2026-04-01 | `C-002` | Added unit and integration regressions for Ollama discovery/reload provider-bucket behavior | `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts`, `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` |
| 2026-04-01 | `C-003` | Added server grouped-provider regression coverage and updated local-runtime design docs | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`, `autobyteus-ts/docs/llm_module_design_nodejs.md` |
| 2026-04-01 | `N/A` | Verified implementation with targeted Vitest runs, `pnpm build`, and live post-build runtime repro | `api-e2e-testing.md` |
| 2026-04-01 | `N/A` | Post-validation re-entry found that the ticket worktree was importing the main-workspace `autobyteus-ts` through borrowed `node_modules`; rebuilt and revalidated from a clean worktree-local install with no additional source changes required | `investigation-notes.md`, `api-e2e-testing.md` |
