# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The fix is small in line count but changes shared startup and managed-messaging runtime semantics.
  - Public URL behavior must stay unchanged while a new runtime-only internal URL path is introduced.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync -> final handoff -> wait for explicit user verification -> move ticket to `done` -> git finalization/release when git repo

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/remote-node-telegram-agent-delivery/workflow-state.md`
- Investigation notes: `tickets/done/remote-node-telegram-agent-delivery/investigation-notes.md`
- Requirements: `tickets/done/remote-node-telegram-agent-delivery/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/remote-node-telegram-agent-delivery/future-state-runtime-call-stack.md`
- Runtime review: `tickets/done/remote-node-telegram-agent-delivery/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/remote-node-telegram-agent-delivery/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes:
  - Stage 5 review gate is `Go Confirmed`.
  - This plan uses the approved change inventory from `proposed-design.md` v1.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` Docker Remote Inbound Delivery
  - `UC-002` Electron Embedded Dynamic Port
  - `UC-003` Managed Runtime Restore / Restart
  - `UC-004` Internal URL Resolution Failure
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001` -> `UC-001`, `UC-003`
  - `R-002` -> `UC-002`, `UC-003`
  - `R-003` -> `UC-001`, `UC-002`
  - `R-004` -> `UC-004`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-003`: all managed gateway start paths must converge on one runtime-only URL resolver.
  - `UC-004`: failure must be explicit and must not silently reuse the public URL.
- Target Architecture Shape (for `Small`, mandatory):
  - Startup owns discovery of the actual listen address.
  - `src/config/server-runtime-endpoints.ts` owns internal URL normalization, seeding, and validation.
  - Managed messaging runtime env generation consumes the runtime-only internal URL and keeps `AUTOBYTEUS_SERVER_HOST` public-only.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - `src/config/server-runtime-endpoints.ts`
- Touched Files/Modules:
  - `autobyteus-server-ts/src/config/server-runtime-endpoints.ts`
  - `autobyteus-server-ts/src/app.ts`
  - `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts`
  - `autobyteus-server-ts/tests/unit/config/server-runtime-endpoints.test.ts`
  - `autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts`
  - `autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts`
  - `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`
- API/Behavior Delta:
  - Managed gateway `GATEWAY_SERVER_BASE_URL` changes from public URL semantics to runtime-only internal URL semantics.
  - Missing or invalid internal runtime URL becomes an explicit managed-gateway startup error.
- Key Assumptions:
  - Managed gateway is always colocated with the server process that launched it.
  - Server startup has access to the actual bound port after `listen()`.
- Known Risks:
  - Test harnesses that bypass `startServer()` must seed the runtime-only internal URL explicitly.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine proposed design document, then regenerate call stack and re-review.
- If `No-Go`, do not continue with dependency sequencing or implementation kickoff.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory decoupling rule: preserve clear module boundaries and one-way dependency direction; avoid adding tight coupling/cycles.
- Mandatory module/file placement rule: keep each touched file in the folder/boundary that owns its concern; plan explicit moves when current placement is misleading.
- Choose the proper structural change for architecture integrity; do not prefer local hacks just because they are smaller.
- One file at a time is the default; use limited parallel work only when dependency edges require it.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | N/A | Defines the shared normalization and runtime-env contract first. |
| 2 | `autobyteus-server-ts/src/app.ts` | `src/config/server-runtime-endpoints.ts` | Startup must seed the runtime-only internal URL from the actual listen address. |
| 3 | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | `src/config/server-runtime-endpoints.ts` | Managed gateway env builder must consume the shared runtime-only resolver. |
| 4 | `autobyteus-server-ts/tests/unit/config/server-runtime-endpoints.test.ts` | `src/config/server-runtime-endpoints.ts` | Verifies normalization, canonicalization, and runtime seeding/failure behavior. |
| 5 | `autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts` | step 3 | Verifies `GATEWAY_SERVER_BASE_URL` uses the internal runtime URL and fails closed. |
| 6 | `autobyteus-server-ts/tests/e2e/messaging/*.e2e.test.ts` | steps 1-3 | Stage 7 adapts API/E2E harness to the runtime-only URL contract. |
| 7 | `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md` | final behavior | Stage 9 documents the split between public and internal URL semantics. |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Runtime internal URL policy | N/A | `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | server runtime configuration | Keep new file in `config` | Helper is consumed by startup and managed messaging without leaking persistence concerns. |
| Startup seeding | `autobyteus-server-ts/src/app.ts` | same | server startup bootstrap | Keep | `startServer()` sets runtime-only internal URL after actual bind. |
| Managed gateway env composition | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | same | managed messaging runtime env builder | Keep | File consumes config helper only; no public URL fallback remains. |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | `proposed-design.md` Target State / Change Inventory `C-001`..`C-003` | `UC-001`, `UC-003` | `T-001`, `T-002`, `T-003`, `T-004` | Unit | `S-001` |
| R-002 | AC-002 | `proposed-design.md` Change Inventory `C-001`, `C-002` | `UC-002`, `UC-003` | `T-001`, `T-002`, `T-004` | Unit | `S-002` |
| R-003 | AC-003 | `proposed-design.md` Architecture Direction / Backward-Compatibility Rejection | `UC-001`, `UC-002` | `T-001`, `T-002`, `T-003`, `T-005` | Unit | `S-003` |
| R-004 | AC-004 | `proposed-design.md` Error Handling And Edge Cases | `UC-004` | `T-003`, `T-004` | Unit | `S-004` |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Docker remote writes reachable internal gateway callback URL | `S-001` | E2E | Planned |
| AC-002 | R-002 | Embedded runtime uses actual bound port rather than `8000` | `S-002` | E2E | Planned |
| AC-003 | R-003 | Public URL semantics stay unchanged for clients | `S-003` | API | Planned |
| AC-004 | R-004 | Missing internal runtime URL fails explicitly | `S-004` | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | `T-001`, `T-004` | No | Unit |
| C-002 | Modify | `T-002`, `T-004` | No | Unit |
| C-003 | Modify | `T-003`, `T-004` | No | Unit |
| C-004 | Modify | `T-004` | No | Unit |
| C-005 | Modify | `T-005` | No | Docs + Stage 8 review |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Public-URL callback fallback path | Remove | Do not read `getBaseUrl()` for `GATEWAY_SERVER_BASE_URL`; replace with runtime-only resolver and explicit failure. | If any hidden caller relied on implicit fallback, tests must surface it. |

## Step-By-Step Plan

1. Add `src/config/server-runtime-endpoints.ts` with internal-host normalization, actual-listen-address seeding, and explicit runtime-env validation.
2. Update `src/app.ts` so `startServer()` seeds the internal runtime URL from the bound address returned after `listen()`.
3. Update `managed-messaging-gateway-runtime-env.ts` so `GATEWAY_SERVER_BASE_URL` is sourced from the runtime-only internal URL helper and fails closed when unavailable.
4. Add focused unit tests for the new helper and managed gateway runtime env behavior.
5. Run targeted unit verification for Stage 6.
6. In Stage 7, update messaging API/E2E tests to seed the runtime-only internal URL where they intentionally bypass `startServer()`, then run mapped acceptance scenarios.
7. In Stage 9, document public URL vs internal colocated runtime URL behavior.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | Helper exports runtime-only internal URL API with validation and canonicalization. | Covers wildcard/loopback/concrete-host/address-info/error cases. | N/A | Foundational module. |
| `autobyteus-server-ts/src/app.ts` | Seeds runtime-only internal URL from actual bound port after `listen()`. | Covered indirectly by helper contract and code review inspection. | Stage 7 E2E covers startup behavior at scenario level. | Full startup integration is deferred to Stage 7 because it crosses server runtime and managed gateway process boundaries. |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | Uses runtime-only internal URL and never the public base URL for gateway callbacks. | Verifies explicit failure on missing internal URL. | Stage 7 E2E validates end-to-end callback path wiring. | No fallback allowed. |
| `autobyteus-server-ts/tests/unit/config/server-runtime-endpoints.test.ts` | New unit test file exists and passes. | Required. | N/A | Stage 6. |
| `autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts` | New unit test file exists and passes. | Required. | N/A | Stage 6. |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/remote-node-telegram-agent-delivery/code-review.md`
- Scope (source + tests):
  - `autobyteus-server-ts/src/config/server-runtime-endpoints.ts`
  - `autobyteus-server-ts/src/app.ts`
  - `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts`
  - Stage 6 and Stage 7 test files touched for this fix
  - `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - No changed source file is expected to cross the hard limit; if one does, classify as `Design Impact` and re-enter before Stage 9.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - Record per-file `git diff --numstat` and justify any `>220` file as part of Stage 8.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - Any limit breach forces re-entry before approval.
- module/file placement review approach (how wrong-folder placements will be detected and corrected):
  - Confirm the new helper remains in `src/config`, startup changes stay in `src/app.ts`, and managed messaging changes stay in the gateway env builder.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/server-runtime-endpoints.ts` | TBD | Yes | Low | Keep | Design Impact |
| `autobyteus-server-ts/src/app.ts` | TBD | Yes | Medium | Keep | Local Fix |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts` | TBD | Yes | Medium | Keep | Design Impact |

## Test Strategy

- Unit tests:
  - `tests/unit/config/server-runtime-endpoints.test.ts`
  - `tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts`
- Integration tests:
  - No dedicated Stage 6 integration test is planned because the behavior boundary crosses server bootstrap and managed child-process startup. That cross-process contract will be exercised in Stage 7 API/E2E scenarios after the unit contract is in place.
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `4`
  - critical flows to validate (API/E2E):
    - remote Docker callback base URL uses loopback/actual server port
    - embedded runtime uses actual dynamic port
    - public URL semantics remain public-only
    - missing internal URL produces explicit managed-gateway error
  - expected scenario count: `4`
  - known environment constraints:
    - test harnesses that call GraphQL directly must seed the runtime-only internal URL without going through `startServer()`
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots:
    - accidental fallback to `getBaseUrl()`
    - seeding the wrong port when the server binds to a dynamically chosen port
  - predicted module/file placement hotspots:
    - keeping runtime endpoint logic inside `app.ts` instead of the config helper
  - files likely to exceed size/SoC thresholds:
    - none expected

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| S-001 | Requirement | AC-001 | R-001 | UC-001, UC-003 | E2E | Managed gateway env uses reachable internal callback URL for remote Docker-style deployment semantics. |
| S-002 | Requirement | AC-002 | R-002 | UC-002, UC-003 | E2E | Managed gateway env uses actual runtime port for embedded dynamic-port semantics. |
| S-003 | Requirement | AC-003 | R-003 | UC-001, UC-002 | API | Public URL-driven behavior remains unchanged for external clients. |
| S-004 | Requirement | AC-004 | R-004 | UC-004 | API | Enabling or restoring managed messaging fails explicitly when no internal runtime URL is available. |

## API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - choose exactly one classification for the current failure event: `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear`.
  - do not allow any in-scope acceptance criterion to remain `Unmapped`, `Not Run`, `Failed`, or `Blocked` at Stage 7 close unless explicitly marked `Waived` by user decision for infeasible cases.
  - First run investigation screen:
    - if issue is cross-cutting, root cause is unclear, or confidence is low, set `Investigation Required = Yes`, pause implementation, and update `tickets/done/remote-node-telegram-agent-delivery/investigation-notes.md` before persisting classification/re-entry records.
    - if issue is clearly bounded with high confidence, set `Investigation Required = No` and classify directly.
  - `Local Fix`: no requirement/design change needed; responsibility boundaries remain intact.
  - `Design Impact`: responsibility boundaries drift, architecture change needed, or patch-on-patch complexity appears.
  - `Requirement Gap`: missing/ambiguous requirement or newly discovered requirement-level constraint.
- Required action:
  - `Local Fix` -> update implementation/review artifacts first, then implement fix, rerun `Stage 6 -> Stage 7`, then rerun affected scenarios.
  - `Design Impact` -> set `Investigation Required = Yes` (mandatory checkpoint), update `investigation-notes.md`, then follow full-chain re-entry.
  - if requirement-level gaps are discovered during the design-impact investigation checkpoint -> reclassify as `Requirement Gap` and follow the requirement-gap path.
  - `Design Impact` (after checkpoint, still design impact) -> return to `Stage 1 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - `Requirement Gap` -> return to `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - `Unclear`/cross-cutting root cause -> return to `Stage 0 -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`; rerun affected scenarios.
  - Stage 0 in a re-entry path means re-open bootstrap controls in the same ticket/worktree (`workflow-state.md`, lock state, artifact baselines); do not create a new ticket folder.
  - when `Investigation Required = Yes`, understanding-stage re-entry is mandatory before design/requirements updates.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | `Not Needed` | Codex |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None at kickoff | N/A | N/A | Proceed with approved design unless implementation reveals a boundary issue. | Pending |
