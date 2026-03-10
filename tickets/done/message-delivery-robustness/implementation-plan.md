# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: The fix adds a new durable runtime delivery subsystem, changes existing reply orchestration, updates server lifecycle behavior, and requires cross-layer verification.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> API/E2E testing -> code review gate -> docs sync -> final handoff

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/message-delivery-robustness/workflow-state.md`
- Investigation notes: `tickets/in-progress/message-delivery-robustness/investigation-notes.md`
- Requirements: `tickets/in-progress/message-delivery-robustness/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/message-delivery-robustness/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/message-delivery-robustness/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/message-delivery-robustness/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 review gate was re-run after the Stage 8 design-impact re-entry and again reached `Go Confirmed` with two clean `v3` rounds and no blocking findings.

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

## Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`, `UC-006`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective): `None`
- Target Architecture Shape:
  - `ReplyCallbackService` validates and enqueues durable callback work.
  - `GatewayCallbackDeliveryRuntime` owns shared outbox/runtime wiring and worker lifecycle.
  - `GatewayCallbackDispatchWorker` owns retry/backoff/lease recovery.
  - `GatewayCallbackDispatchTargetResolver` owns availability-aware gateway target lookup.
  - `ManagedMessagingGatewayService` remains the public facade for admin-facing managed gateway operations.
  - `ManagedMessagingGatewayRuntimeLifecycle` owns managed runtime start/stop/adopt/reconcile behavior.
  - `ManagedMessagingGatewaySupervision` owns timer-driven exit and heartbeat/liveness recovery.
  - `ManagedMessagingGatewayRuntimeHealth` owns reliability payload parsing and restart backoff helpers.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - callback dispatch target resolver
  - callback outbox store/service
  - callback dispatch worker
  - callback delivery runtime composition root
- Touched Files/Modules:
  - add new runtime files for callback delivery
  - modify `reply-callback-service.ts`
  - modify `external-channel-assistant-reply-processor.ts`
  - modify `runtime-external-channel-turn-bridge.ts`
  - modify `app.ts`
  - modify `managed-messaging-gateway-service.ts`
  - add `managed-messaging-gateway-runtime-lifecycle.ts`
  - add `managed-messaging-gateway-supervision.ts`
  - add `managed-messaging-gateway-runtime-health.ts`
- API/Behavior Delta:
  - reply callbacks are queued durably before gateway publish instead of published synchronously in the request path
  - worker handles retries and dead-letter state
- Key Assumptions:
  - file-backed outbox is acceptable for current single-node deployment
  - gateway-side callback endpoint remains idempotent by callback key
- Known Risks:
  - managed gateway unavailable with no resolvable target must remain retryable, not be treated as “not configured”
  - heartbeat freshness policy must avoid false-positive restart loops while still detecting wedged runtimes

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |
| 3 | Pass | No | No | Yes | N/A | N/A | Candidate Go | 1 |
| 4 | Pass | No | No | Yes | N/A | N/A | Go Confirmed | 2 |
| 5 | Pass | No | No | Yes | N/A | N/A | Candidate Go | 1 |
| 6 | Pass | No | No | Yes | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `6`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up: implement target resolver and outbox primitives before dependent orchestration.
- Test-driven: add unit coverage for new runtime primitives and update existing service/processor tests alongside code changes.
- Mandatory modernization rule: no backward-compatibility shims or legacy direct-publish branch.
- Mandatory decoupling rule: reply generation must not depend on gateway liveness.
- Mandatory module/file placement rule: new delivery runtime files stay under `src/external-channel/runtime`.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `gateway-callback-dispatch-target-resolver.ts` | app config + managed gateway service | Required by reply service and worker |
| 2 | `gateway-callback-outbox-store.ts` / `gateway-callback-outbox-service.ts` | file persistence utils | Required by worker and reply service |
| 3 | `gateway-callback-dispatch-worker.ts` | resolver + outbox service + publisher | Core retry runtime |
| 4 | `gateway-callback-delivery-runtime.ts` | worker + outbox service + resolver | Shared runtime composition root |
| 5 | `reply-callback-service.ts` | runtime composition root | Main behavior change |
| 6 | `managed-messaging-gateway-runtime-health.ts` | managed types + env policy | Shared support logic for lifecycle and supervision |
| 7 | `managed-messaging-gateway-runtime-lifecycle.ts` | process supervisor + admin client + runtime health helper | Runtime orchestration split |
| 8 | `managed-messaging-gateway-supervision.ts` | runtime lifecycle + runtime health helper + storage | Timer and restart policy split |
| 9 | `managed-messaging-gateway-service.ts` | lifecycle helper + supervision helper | Reduce public service to facade/composition role |
| 10 | reply processor / runtime turn bridge / app lifecycle | updated reply service runtime | Final wiring |
| 11 | tests | implementation | Verification |

## Module/File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Callback target resolver | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts` | External-channel runtime delivery | Add | unit tests |
| Callback outbox store | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | External-channel runtime delivery persistence | Add | unit tests |
| Callback outbox service | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts` | External-channel runtime delivery orchestration | Add | unit tests |
| Callback dispatch worker | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts` | External-channel runtime delivery orchestration | Add | unit/integration tests |
| Delivery runtime composition root | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts` | External-channel runtime lifecycle | Add | integration tests |
| Reply callback service | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | same | Reply-domain service | Keep | unit/integration tests |
| Managed gateway public facade | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | same | Managed gateway admin-facing lifecycle ownership | Split | unit/integration tests |
| Managed gateway runtime lifecycle | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts` | Managed gateway runtime orchestration | Add | unit/integration tests |
| Managed gateway supervision | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts` | Managed gateway supervision policy | Add | unit/integration tests |
| Managed gateway runtime health | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.ts` | Managed gateway reliability parsing and backoff support | Add | unit tests |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | `Target State`, `Data Models` | `UC-001`, `UC-002` | `T-001`, `T-002`, `T-006` | Unit + Integration | `AV-001` |
| R-002 | AC-001, AC-002, AC-003 | `Target State`, `Error Handling And Edge Cases` | `UC-002`, `UC-003` | `T-002`, `T-003`, `T-004`, `T-009` | Unit + Integration | `AV-002`, `AV-003` |
| R-003 | AC-004 | `Target State`, `Use-Case Coverage Matrix` | `UC-004` | `T-006`, `T-007`, `T-008` | Unit | `AV-004` |
| R-004 | AC-003, AC-005 | `Target State`, `Data Models` | `UC-001`, `UC-003` | `T-002`, `T-003`, `T-006` | Unit + Integration | `AV-001`, `AV-003` |
| R-005 | AC-002 | `Target State`, `Error Handling And Edge Cases` | `UC-002`, `UC-003` | `T-004`, `T-005`, `T-009` | Integration | `AV-002` |
| R-006 | AC-006 | `Target State`, `Error Handling And Edge Cases` | `UC-005` | `T-011`, `T-012`, `T-013`, `T-014` | Unit + Integration | `AV-005` |
| R-007 | AC-007 | `Target State`, `Error Handling And Edge Cases` | `UC-006` | `T-011`, `T-012`, `T-013`, `T-014` | Unit + Integration | `AV-006` |

## Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Gateway-down callback remains queued then later succeeds | AV-001 | API | Planned |
| AC-002 | R-002 | In-flight callback recovers after restart/lease expiry | AV-002 | API | Planned |
| AC-003 | R-002 | Retry exhaustion produces terminal inspectable state | AV-003 | API | Planned |
| AC-004 | R-003 | Duplicate callback key does not duplicate work | AV-004 | API | Planned |
| AC-005 | R-004 | Persisted state distinguishes queue status from delivery-event status | AV-001, AV-003 | API | Planned |
| AC-006 | R-006 | Managed gateway unexpected exit triggers bounded restart recovery | AV-005 | API | Planned |
| AC-007 | R-007 | Managed gateway stale heartbeat or unhealthy runtime triggers bounded restart recovery | AV-006 | API | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-001 | No | Unit + AV-001 |
| C-002 | Add | T-002 | No | Unit + AV-001 + AV-003 |
| C-003 | Add | T-003 | No | Unit |
| C-004 | Add | T-004 | No | Unit + AV-002 + AV-003 |
| C-005 | Add | T-005 | No | Integration |
| C-006 | Modify | T-006 | No | Unit + AV-001 + AV-004 |
| C-007 | Modify | T-007 | No | Unit |
| C-008 | Modify | T-008 | No | Unit |
| C-009 | Modify | T-009 | No | Integration |
| C-010 | Remove | T-010 | Yes | Unit |
| C-011 | Modify | T-011 | No | Unit + Integration + AV-005 + AV-006 |
| C-012 | Add | T-012 | No | Unit + Integration + AV-005 + AV-006 |
| C-013 | Add | T-013 | No | Unit + Integration + AV-005 + AV-006 |
| C-014 | Add | T-014 | No | Unit |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-010 | old sync callback options resolver | Remove | replace imports, add new resolver tests, remove obsolete unit test expectations | low |
| T-011 | managed gateway service facade split | Modify | reduce the public service to admin/lifecycle orchestration and inject lifecycle/supervision collaborators | medium |
| T-012 | managed gateway runtime lifecycle helper | Add | move install/start/adopt/restart/stop/reconcile logic and reachable-runtime discovery into a dedicated module | medium |
| T-013 | managed gateway supervision helper | Add | move process-exit handling, timer lifecycle, health evaluation, and bounded restart scheduling into a dedicated module | medium |
| T-014 | managed gateway runtime health helper | Add | move reliability payload parsing, heartbeat staleness checks, and restart-delay helpers into a dedicated module | low |

## Step-By-Step Plan

1. Implement dynamic callback target resolution that distinguishes `AVAILABLE`, `UNAVAILABLE`, and `DISABLED`.
2. Implement durable callback outbox persistence and state-transition service with lease support.
3. Implement callback dispatch worker with bounded retry and dead-letter behavior.
4. Implement shared callback delivery runtime wiring and lifecycle start/stop hooks.
5. Refactor `ReplyCallbackService` to enqueue durable callback work and update delivery-event semantics.
6. Extract managed gateway runtime-health helpers for reliability payload parsing and restart-policy math.
7. Extract managed gateway runtime lifecycle orchestration into a dedicated helper module.
8. Extract managed gateway supervision and bounded restart policy into a dedicated helper module.
9. Reduce `ManagedMessagingGatewayService` to the public facade that delegates to the new helpers.
10. Refactor existing reply callers to use the shared runtime/factory and remove the old sync resolver path.
11. Add unit and integration coverage for queueing, retry, recovery, dead-letter, dedupe, managed restart, and lifecycle wiring.

## Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `gateway-callback-dispatch-target-resolver.ts` | resolves explicit, managed-available, managed-unavailable, and disabled states | dedicated resolver test | N/A | async |
| `gateway-callback-outbox-store.ts` | persists, leases, retries, dead-letters, recovers expired leases | store/service tests | N/A | file-backed |
| `gateway-callback-dispatch-worker.ts` | retries recoverable failures, dead-letters terminal failures, marks sent | worker tests | local fake gateway test | core runtime |
| `reply-callback-service.ts` | enqueues durable work and records delivery events correctly | service tests | worker/runtime integration | main behavior shift |
| `app.ts` | starts and stops callback runtime with app lifecycle | N/A | lifecycle integration test | no source edit before stage unlock |
| `managed-messaging-gateway-runtime-health.ts` | parses runtime reliability payloads and restart policy inputs without storage/process side effects | helper tests | N/A | support logic |
| `managed-messaging-gateway-runtime-lifecycle.ts` | starts, adopts, reconciles, restarts, and stops managed runtimes with correct persisted-state behavior | lifecycle tests | managed runtime integration where feasible | process/reachability ownership |
| `managed-messaging-gateway-supervision.ts` | schedules bounded restart on unexpected exit and heartbeat/liveness stall without leaking timer state | supervision tests | managed runtime integration where feasible | timer/restart ownership |
| `managed-messaging-gateway-service.ts` | exposes the same public managed gateway API while delegating lifecycle and supervision to the split modules | managed service tests | managed runtime integration where feasible | public facade |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/message-delivery-robustness/code-review.md`
- Scope (source + tests): new callback runtime files, modified reply service/runtime callers, updated tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split runtime files further if any single source file crosses the threshold
- per-file diff delta gate (`>220` changed lines) assessment approach: record any large file and justify boundary placement
- module/file placement review approach: confirm all new runtime files remain under `src/external-channel/runtime` and managed gateway split files remain under `src/managed-capabilities/messaging-gateway`

## Test Strategy

- Unit tests:
  - resolver state selection
  - outbox store/service transitions
  - worker retry/terminal classification
  - reply callback service enqueue/dedupe behavior
  - managed gateway runtime-health helpers
  - managed gateway runtime lifecycle behavior
  - managed gateway unexpected-exit restart and heartbeat/liveness restart classification
  - updated processor/turn-bridge wiring
- Integration tests:
  - callback worker + fake gateway recovery flow
  - managed gateway restart recovery from exit and stale heartbeat where feasible
  - app lifecycle start/stop wiring where feasible
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `7`
  - critical flows to validate (API/E2E): queue/retry/recovery/dead-letter/dedupe/managed-exit-restart/managed-heartbeat-restart
  - expected scenario count: `6`
  - known environment constraints: external provider access is not required if a local fake gateway is used

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-005 | R-001, R-004 | UC-001, UC-002 | API | Gateway-down reply stays queued and is later accepted; persisted state remains diagnosable |
| AV-002 | Requirement | AC-002 | R-002, R-005 | UC-002 | API | Expired in-flight lease or restart resumes dispatch |
| AV-003 | Requirement | AC-003, AC-005 | R-002, R-004 | UC-003 | API | Retry exhaustion marks dead-letter and failure state |
| AV-004 | Requirement | AC-004 | R-003 | UC-004 | API | Duplicate callback key does not duplicate durable work |
| AV-005 | Requirement | AC-006 | R-006 | UC-005 | API | Managed gateway unexpected exit triggers bounded restart and queued callbacks recover |
| AV-006 | Requirement | AC-007 | R-007 | UC-006 | API | Managed gateway stale heartbeat or unhealthy runtime triggers bounded restart and queued callbacks recover |

## API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - `Local Fix`: bounded implementation issue without requirement/design change
  - `Design Impact`: runtime boundary or placement drift
  - `Requirement Gap`: missing requirement behavior or scenario
  - `Unclear`: cross-cutting low-confidence failure

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None planned | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Stage 6 requirement-gap re-entry | Managed gateway restart ownership and heartbeat supervision were missing from the first implementation pass | `requirements.md`, `Target State`, `Error Handling And Edge Cases`, runtime call stacks | Completed | Re-baselined at `v2` before reopening Stage 6 |
| Stage 8 design-impact re-entry | `managed-messaging-gateway-service.ts` remained too concentrated even after functional fixes were correct | `proposed-design.md`, runtime call stacks, implementation plan | Completed | Re-baselined at `v3` before reopening Stage 6 |
