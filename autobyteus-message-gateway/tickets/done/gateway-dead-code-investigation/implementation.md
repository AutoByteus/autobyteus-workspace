# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: the change touches multiple subsystem edges (`application`, `domain`, `infrastructure`, `config`, and `tests`) but preserves the existing runtime architecture and centers on a narrow removal set.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/gateway-dead-code-investigation/workflow-state.md`
- Investigation notes: `tickets/in-progress/gateway-dead-code-investigation/investigation-notes.md`
- Requirements: `tickets/in-progress/gateway-dead-code-investigation/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/gateway-dead-code-investigation/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/gateway-dead-code-investigation/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/in-progress/gateway-dead-code-investigation/proposed-design.md`

## Document Status

- Current Status: `In Execution`
- Notes: Stage 5 review reached `Go Confirmed`; implementation is limited to the confirmed dead-code cluster and aligned gateway tests/config.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001` through `UC-005`
- Spine Inventory In Scope: `DS-001` through `DS-005`
- Primary Owners / Main Domain Subjects: bootstrap/runtime composition, server callback route + outbox service, inbound inbox service, provider adapters, config bootstrap
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective): `None`
- Target Architecture Shape: keep the current runtime spine and delete the dead callback-idempotency and chunk-planner leftovers; trim the mixed idempotency helper file and remove unused gateway-local config fields
- New Owners/Boundary Interfaces To Introduce: `None`
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta: no intended runtime behavior change; only removal of dead source and dead config surface
- Key Assumptions:
  - `defaultRuntimeConfig()` stays in production source for this round as a test helper
  - upstream managed-runtime env emission is outside this repo’s implementation scope
- Known Risks:
  - config tests and dead-file unit tests need synchronized cleanup to avoid stale imports
  - validation quality depends on the local `pnpm`/Vitest environment

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

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-002, DS-003, DS-004 | Application/domain/infrastructure dead-code owners | Delete callback-idempotency cluster, delete chunk planner, trim `idempotency-service.ts` | Stage 5 go decision | Removes dead owners first |
| 2 | DS-005 | Config bootstrap | Remove old TTL env/runtime-config fields and fix tests | Order 1 | Keeps config aligned with post-deletion source |
| 3 | DS-001 | Validation owners | Run unit/integration regression checks for kept Telegram spine and cleaned scope | Orders 1-2 | Confirms no live spine breakage |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Inbound key helper | `src/application/services/idempotency-service.ts` | same | Inbound inbox helper | Keep/Trim | Helper-only tests pass |
| Dead callback-idempotency cluster | `src/application/services/callback-idempotency-service.ts`, `src/domain/models/idempotency-store.ts`, `src/infrastructure/idempotency/in-memory-idempotency-store.ts` | N/A | Removed dead owners | Remove | Source/test grep clean |
| Dead chunk planner | `src/application/services/outbound-chunk-planner.ts` | N/A | Removed dead abstraction | Remove | Source/test grep clean |
| Runtime config/env cleanup | `src/config/env.ts`, `src/config/runtime-config.ts` | same | Live config only | Keep/Trim | Config tests pass |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-002 | Callback route/outbox existing owners | Remove dead callback-idempotency cluster | `src/application/services/callback-idempotency-service.ts`, `src/domain/models/idempotency-store.ts`, `src/infrastructure/idempotency/in-memory-idempotency-store.ts` | N/A | Remove | None | Completed | `tests/unit/application/services/callback-idempotency-service.test.ts`, `tests/unit/infrastructure/idempotency/in-memory-idempotency-store.test.ts` | Passed | `tests/integration/http/routes/server-callback-route.integration.test.ts` | Passed | Planned | Dead source files and dedicated tests removed; callback route integration still passes |
| C-002 | DS-003 | Inbound inbox service | Trim `idempotency-service.ts` to helper only | `src/application/services/idempotency-service.ts` | same | Modify | C-001 | Completed | `tests/unit/application/services/idempotency-service.test.ts` | Passed | `tests/e2e/inbound-webhook-forwarding.e2e.test.ts` | Passed | Planned | Helper-only file remains on the live inbox path |
| C-003 | DS-004 | Provider adapters | Remove dead chunk planner | `src/application/services/outbound-chunk-planner.ts` | N/A | Remove | None | Completed | `tests/unit/application/services/outbound-chunk-planner.test.ts` | Passed | `tests/integration/bootstrap/create-gateway-app.integration.test.ts` | Passed | Planned | Adapter-local outbound behavior unchanged; dead planner removed |
| C-004 | DS-005 | Config bootstrap | Remove unused idempotency TTL env/runtime-config fields | `src/config/env.ts`, `src/config/runtime-config.ts` | same | Modify | C-001 | Completed | `tests/unit/config/env.test.ts`, `tests/unit/config/runtime-config.test.ts` | Passed | `tests/integration/bootstrap/create-gateway-app.integration.test.ts`, `tests/e2e/inbound-webhook-forwarding.e2e.test.ts` | Passed | Planned | `defaultRuntimeConfig()` intentionally retained |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | DS-001 | `Data-Flow Spine Inventory`, `Architecture Direction Decision` | UC-001 | C-001, C-003, C-004 | Unit/Integration | AV-001 |
| R-002 | AC-002, AC-003 | DS-002 | `Removal / Decommission Plan` | UC-002 | C-001 | Unit | AV-002 |
| R-003 | AC-004 | DS-003 | `Final File Responsibility Mapping` | UC-003 | C-002 | Unit | AV-003 |
| R-004 | AC-005 | DS-004 | `Removal / Decommission Plan` | UC-004 | C-003 | Unit/Integration | AV-004 |
| R-005 | AC-006 | DS-005 | `Shared Structure / Data Model Tightness Check` | UC-005 | C-004 | Unit | AV-005 |
| R-006 | AC-007 | DS-002, DS-003, DS-004, DS-005 | `Change Inventory` | UC-002, UC-003, UC-004, UC-005 | C-001, C-002, C-003, C-004 | Unit/Integration | AV-006 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001 | Telegram bootstrap and webhook/discovery flow still work after cleanup | AV-001 | API | Planned |
| AC-003 | R-002 | DS-002 | Callback route still deduplicates by outbox enqueue path | AV-002 | API | Planned |
| AC-004 | R-003 | DS-003 | Inbound key helper still builds stable ingress keys | AV-003 | API | Planned |
| AC-005 | R-004 | DS-004 | Adapter-local outbound chunk handling remains intact | AV-004 | API | Planned |
| AC-006 | R-005 | DS-005 | Gateway runtime config exposes only live fields | AV-005 | API | Planned |
| AC-007 | R-006 | DS-002, DS-003, DS-004, DS-005 | Dead-file tests removed and scoped suite passes | AV-006 | API | Planned |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| C-001 | C-001 | Yes | Unit + grep |
| C-002 | C-001 | Yes | Unit + grep |
| C-003 | C-001 | Yes | Unit + grep |
| C-004 | C-002 | No | Unit |
| C-005 | C-003 | Yes | Unit + grep |
| C-006 | C-004 | No | Unit |
| C-007 | C-004 | No | Unit |
| C-008 | C-001, C-002, C-003, C-004 | Yes | Unit/Integration |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Callback-idempotency service/store cluster | Remove | Delete source files, delete dedicated tests, verify no remaining imports | Low |
| T-DEL-002 | `IdempotencyService` class | Remove | Trim mixed file and trim unit test | Low |
| T-DEL-003 | `OutboundChunkPlanner` | Remove | Delete source file and delete dedicated unit test | Low |

### Step-By-Step Plan

1. Remove the confirmed dead source files and trim the mixed idempotency helper file.
2. Remove the unused gateway-local TTL env/config surface and align unit tests.
3. Run scoped validation, then continue into Stage 7, Stage 8, and Stage 9 artifacts.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/gateway-dead-code-investigation/code-review.md`
- Scope (source + tests): dead-code deletions, config trimming, and aligned tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: not expected to be close; trimming should reduce size
- per-file diff delta gate (`>220` changed lines) assessment approach: inspect trimmed files and confirm no changed source file crosses the threshold
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): not expected
- file-placement review approach (how wrong-folder placements will be detected and corrected): verify each kept concern still lives under the same existing owner after cleanup

### Test Strategy

- Unit tests: helper-key generation and config/env parsing plus any directly impacted provider/runtime unit tests
- Integration tests: existing Telegram bootstrap and webhook/discovery tests as regression anchors
- Stage 6 boundary: file and service-level verification, while preserving readable subsystem grouping, only (unit + integration)
- Stage 7 handoff notes for API/E2E testing:
  - canonical artifact path: `tickets/in-progress/gateway-dead-code-investigation/api-e2e-testing.md`
  - expected acceptance criteria count: `7`
  - critical flows to validate (API/E2E): Telegram bootstrap/webhook/discovery, callback enqueue dedupe, helper/config cleanup side effects
  - expected scenario count: `6`
  - known environment constraints: depends on local Vitest environment only; no external provider credentials required for scoped regression tests
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/in-progress/gateway-dead-code-investigation/code-review.md`
  - predicted design-impact hotspots: accidental over-deletion of live helper/config shape
  - predicted file-placement hotspots: none
  - predicted interface/API/query/command/service-method boundary hotspots: callback route and inbound inbox helper
  - files likely to exceed size/ownership/SoC thresholds: none

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/gateway-dead-code-investigation/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/gateway-dead-code-investigation/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-27: Implementation baseline created after Stage 5 `Go Confirmed`.
- 2026-03-27: Removed the confirmed dead callback-idempotency cluster and dead chunk planner, trimmed `idempotency-service.ts` to the live helper, and removed unused gateway-local idempotency TTL config fields.
- 2026-03-27: Validation completed with `pnpm typecheck`, `pnpm build`, `pnpm test`, `rg -n "CallbackIdempotencyService|IdempotencyService|InMemoryIdempotencyStore|OutboundChunkPlanner|GATEWAY_IDEMPOTENCY_TTL_SECONDS|GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS|idempotencyTtlSeconds|callbackIdempotencyTtlSeconds" src tests`, and `pnpm dlx ts-prune -p tsconfig.build.json`.

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | N/A | No | None | Not Needed | Not Needed | 2026-03-27 | `pnpm test` plus dead-symbol grep | No remaining source/test references to deleted callback-idempotency files |
| C-002 | N/A | No | None | Not Needed | Not Needed | 2026-03-27 | `pnpm test` | Helper-only `idempotency-service.ts` validated by unit and e2e coverage |
| C-003 | N/A | No | None | Not Needed | Not Needed | 2026-03-27 | `pnpm test` plus dead-symbol grep | Dead chunk planner removed; adapter-owned send paths unchanged |
| C-004 | N/A | No | None | Not Needed | Not Needed | 2026-03-27 | `pnpm typecheck && pnpm build && pnpm test` | Config/env cleanup validated by compiler, build, unit, integration, and e2e coverage |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E | `tickets/in-progress/gateway-dead-code-investigation/api-e2e-testing.md` | `Passed` | 2026-03-27 | Acceptance criteria and spine scenarios closed with passing executable evidence |
| 8 Code Review | `tickets/in-progress/gateway-dead-code-investigation/code-review.md` | `Pass` | 2026-03-27 | No findings; structural and validation checks all passed |
| 9 Docs Sync | `tickets/in-progress/gateway-dead-code-investigation/docs-sync.md` | `No impact` | 2026-03-27 | README remained accurate; only historical ticket docs still mention removed internals |
