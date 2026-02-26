# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: single cohesive bug around node ID canonicalization and placement.

## Upstream Artifacts (Required)

- Investigation notes: `tickets/team-cross-node-home-node-alias-fix/investigation-notes.md`
- Requirements: `tickets/team-cross-node-home-node-alias-fix/requirements.md` (`Design-ready`)
- Runtime call stacks: `tickets/team-cross-node-home-node-alias-fix/proposed-design-based-runtime-call-stack.md` (`v1`)
- Runtime review: `tickets/team-cross-node-home-node-alias-fix/runtime-call-stack-review.md` (`Go Confirmed`)
- Proposed design: `N/A (Small scope)`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: runtime review gate satisfied (`Go Confirmed`).

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready`: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch

- `UC-001`: canonicalize remote node identity during catalog resolution and register alias.
- `UC-002`: placement canonicalizes `homeNodeId` via alias service before strict validation.
- `UC-003`: if no alias exists, keep strict `UnknownHomeNodeError` behavior.

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | N/A | Candidate Go | 1 |
| 2 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/distributed/node-directory/node-id-alias-service.ts` | None | shared primitive |
| 2 | `src/federation/catalog/federated-catalog-service.ts` | alias service | registers alias mappings |
| 3 | `src/distributed/member-placement/member-placement-resolver.ts` | alias service | consumes mappings before validation |
| 4 | `tests/unit/federation/federated-catalog-service.test.ts` | implementation files | verifies canonical registration |
| 5 | `tests/unit/distributed/member-placement-resolver.test.ts` | implementation files | verifies canonical placement |

## Requirement And Design Traceability

| Requirement | Design Section | Use Case / Call Stack | Planned Task ID(s) | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | Solution Sketch | UC-001 | T-001 | Unit test |
| AC-002 | Solution Sketch | UC-001, UC-002 | T-001, T-002 | Unit test |
| AC-003 | Solution Sketch | UC-002 | T-003 | Unit test |
| AC-004 | Solution Sketch | UC-001, UC-002 | T-002, T-003 | Unit + integration subset |
| AC-005 | Solution Sketch | UC-003 | T-004 | Unit test |

## Step-By-Step Plan

1. Add node-id alias service and singleton accessor.
2. Canonicalize remote node IDs in federated catalog by discovery/baseUrl matching and register alias mapping.
3. Canonicalize member home node IDs in member placement resolver using alias mapping.
4. Add/update unit tests for alias registration and placement canonicalization.
5. Run focused unit tests + distributed integration subset.
6. Record docs sync impact.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | E2E Criteria | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/distributed/node-directory/node-id-alias-service.ts` | alias service supports register/resolve/reset | direct behavior covered via dependent tests | N/A | N/A | new file |
| `src/federation/catalog/federated-catalog-service.ts` | canonicalizes remote IDs and registers alias | federated catalog unit test asserts alias path | covered by distributed subset indirectly | N/A | no public API break |
| `src/distributed/member-placement/member-placement-resolver.ts` | canonicalizes home node ID via alias service | member placement unit test asserts alias success | covered by distributed subset indirectly | N/A | strict unknown behavior preserved |

## Test Strategy

- Unit tests:
  - `pnpm exec vitest --run tests/unit/federation/federated-catalog-service.test.ts`
  - `pnpm exec vitest --run tests/unit/distributed/member-placement-resolver.test.ts`
- Integration tests:
  - `pnpm exec vitest --run tests/integration/distributed/team-rerun-rebootstrap.integration.test.ts`
  - `pnpm exec vitest --run tests/integration/distributed/cross-node-message-roundtrip.integration.test.ts`
- E2E feasibility: `Not Feasible` for full UI+docker path in this backend coding pass.
- Best-available non-E2E evidence: focused unit + distributed integration runs.
- Residual risk: alias map is process memory and requires catalog refresh in each process lifecycle.
