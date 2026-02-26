# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: UI-only enhancement in one page (`AgentTeamDetail`) plus localized resolver reuse and unit-test updates.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> finalize implementation plan -> progress tracking

## Upstream Artifacts (Required)

- Investigation notes: `tickets/in-progress/team-members-node-visibility-detail/investigation-notes.md`
- Requirements: `tickets/in-progress/team-members-node-visibility-detail/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/team-members-node-visibility-detail/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/team-members-node-visibility-detail/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A (Small scope)`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Runtime review gate reached `Go Confirmed` after two consecutive clean deep-review rounds.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - UC-001: Show explicit node/source in member cards.
  - UC-002: Keep blueprint resolution node-scoped and stable under cross-node ID collision.
- Touched Files/Modules:
  - `components/agentTeams/AgentTeamDetail.vue`
  - `components/agentTeams/__tests__/AgentTeamDetail.spec.ts`
  - `stores/agentTeamContextsStore.ts`
  - `stores/__tests__/agentTeamContextsStore.spec.ts`
- API/Behavior Delta:
  - Add node/source chip in each member card with clear embedded/remote distinction.
  - Keep blueprint resolution by `(homeNodeId, referenceId)`.
  - Keep runtime member naming node-aware for remote members.
- Key Assumptions:
  - `nodeStore.getNodeById(homeNodeId)?.name` yields user-facing node names.
  - Fallback text to raw node ID is acceptable when unresolved.
- Known Risks:
  - Node metadata fetch timing may cause fallback text until catalog/registry is ready.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Pass | Yes | Yes | Reset | 0 |
| 2 | Pass | No | N/A | Candidate Go | 1 |
| 3 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `3`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - N/A
- If `No-Go`, do not continue with dependency sequencing or implementation kickoff.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- One file at a time is the default; use limited parallel work only when dependency edges require it.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `components/agentTeams/AgentTeamDetail.vue` | Existing stores (`nodeStore`, `federatedCatalogStore`, `agentDefinitionStore`) | Core behavior and UI changes originate here. |
| 2 | `stores/agentTeamContextsStore.ts` | Existing federated lookup | Keep runtime member naming aligned with node-aware identity. |
| 3 | Tests (`AgentTeamDetail.spec.ts`, `agentTeamContextsStore.spec.ts`) | Implementation updates | Validate behavior and prevent regression. |

## Requirement And Design Traceability

| Requirement | Design Section | Use Case / Call Stack | Planned Task ID(s) | Verification |
| --- | --- | --- | --- | --- |
| R-001 member source visibility | Solution Sketch | UC-001 | T-001, T-003 | Unit |
| R-002 node-aware identity correctness | Solution Sketch | UC-002 | T-002, T-004 | Unit |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Legacy ID-only display path in detail member card | `Remove` | Replace with node-aware display path only | Low |

## Step-By-Step Plan

1. Add node/source display model and chip rendering in detail member cards.
2. Keep member blueprint/name resolution node-aware and readable fallbacks.
3. Align runtime member display naming path in team contexts store.
4. Update and run focused unit tests.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | E2E Criteria | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/agentTeams/AgentTeamDetail.vue` | Member cards show source node chips + node-aware fallback text | Detail component test covers remote vs embedded source label | N/A | N/A | UI-only |
| `stores/agentTeamContextsStore.ts` | Member config naming remains node-aware | Store spec asserts remote member gets federated name | N/A | N/A | Store-level behavior |

## Test Strategy

- Unit tests: `AgentTeamDetail.spec.ts`, `agentTeamContextsStore.spec.ts`.
- Integration tests: none required for this small UI/store adjustment.
- E2E feasibility: `Not Feasible`
- If E2E is not feasible, concrete reason and current constraints: no deterministic multi-node UI harness in this local loop.
- Best-available non-E2E verification evidence when E2E is not feasible: focused component and store unit tests plus direct runtime data validation.
- Residual risk notes: visual density on small screens may need manual spot-check.

## Test Feedback Escalation Policy (Execution Guardrail)

- Classification rules for failing integration/E2E tests:
  - First run investigation screen:
    - if issue is cross-cutting, root cause is unclear, or confidence is low, set `Investigation Required = Yes`, pause implementation, and update `tickets/in-progress/team-members-node-visibility-detail/investigation-notes.md` before classification write-back.
    - if issue is clearly bounded with high confidence, set `Investigation Required = No` and classify directly.
  - `Local Fix`: no requirement/design change needed; responsibility boundaries remain intact.
  - `Design Impact`: responsibility boundaries drift, architecture change needed, or patch-on-patch complexity appears.
  - `Requirement Gap`: missing/ambiguous requirement or newly discovered requirement-level constraint.
- Required action:
  - `Local Fix` -> implement fix and keep structure clean.
  - `Design Impact` -> stop implementation; update design basis; regenerate call stacks; re-run review to `Go Confirmed`.
  - `Requirement Gap` -> stop implementation; update `requirements.md` to `Refined`; update design basis; regenerate call stacks; re-run review to `Go Confirmed`.
  - when `Investigation Required = Yes`, understanding-stage re-entry is mandatory before design/requirements updates.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTeamDetail.vue` | `federatedCatalogStore` + `nodeStore` | Member source/identity is cross-node concern | Keep lookup helpers local and concise for this ticket | Extract shared resolver if more views need same behavior | `Needed` | This ticket |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Resolver duplication risk | Detail view + team context store | Solution Sketch + Sequencing | Keep duplication bounded; prefer follow-up shared resolver extraction only if scope grows | Accepted for this scope |
