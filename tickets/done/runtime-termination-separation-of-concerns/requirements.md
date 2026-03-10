# Requirements

- Status: `Design-ready`
- Ticket: `runtime-termination-separation-of-concerns`
- Owner: `Codex`
- Last Updated: `2026-03-10`

## Goal / Problem Statement

Runtime-managed agent runs currently terminate through a mixed path in the GraphQL resolver. `terminateAgentRun(...)` first calls the native `AgentRunManager` removal path and only afterward checks whether the run is actually owned by a runtime session such as Codex or Claude. For non-native runtimes this creates noisy warnings, weakens separation of concerns, and makes termination behavior depend on an ownership mismatch instead of an explicit runtime decision.

This follow-up ticket should investigate and, if confirmed, refactor agent-run termination so runtime ownership is resolved first and the correct termination path is invoked directly.

## Scope Classification

- Classification: `Medium`
- Rationale: the issue crosses GraphQL mutation handling, native agent-run management, runtime session ownership, and post-termination cleanup behavior.

## In-Scope Use Cases

| use_case_id | Name | Description | Source Requirement IDs |
| --- | --- | --- | --- |
| `UC-001` | Native agent termination routing | Native `autobyteus` runs terminate through the native agent manager path that removes the active agent entry and stops the agent cleanly. | `R-001`, `R-003` |
| `UC-002` | Runtime-managed agent termination routing | Codex and Claude runs terminate through the runtime ingress boundary without first attempting native agent removal. | `R-001`, `R-002`, `R-003` |
| `UC-003` | Shared cleanup after successful termination | After a successful terminate decision, runtime-session removal and run-history state updates happen once regardless of routing path. | `R-003` |
| `UC-004` | Not-found handling | Unknown or already inactive runs return a stable not-found result without double-cleanup side effects. | `R-004` |

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| `R-001` | Termination routing must respect effective runtime ownership, not only run ID presence. | Native `autobyteus` runs use the native agent-manager path, while non-`autobyteus` runtime-managed runs use the runtime ingress boundary directly. |
| `R-002` | Non-native runtime termination must not depend on a failing native removal attempt. | Codex and Claude run shutdown no longer triggers the false `Agent with ID ... not found for removal.` warning during normal termination. |
| `R-003` | Shared cleanup must remain centralized and correct after routing changes. | Runtime-session removal and run-history termination hooks execute exactly once after successful termination, regardless of whether the chosen path was native or runtime-managed. |
| `R-004` | Verification must cover route selection and not-found behavior. | Tests prove the correct path is selected for native vs non-native runs, success behavior is preserved, and unknown runs remain stable. |

## Acceptance Criteria

| acceptance_criteria_id | Acceptance Criterion | Measurable Expected Outcome | Requirement IDs |
| --- | --- | --- | --- |
| `AC-001` | Native termination keeps using the native removal path. | Automated coverage proves `autobyteus` runs still invoke the native agent-manager termination flow and remove the run from active native ownership. | `R-001`, `R-003` |
| `AC-002` | Non-native runtime termination bypasses native removal. | Automated coverage proves Codex and Claude runs do not call native termination before runtime ingress termination. | `R-001`, `R-002` |
| `AC-003` | Shared cleanup stays single-path and successful. | Automated coverage proves runtime-session removal and run-history termination hooks are called exactly once after a successful termination result. | `R-003` |
| `AC-004` | Not-found behavior remains stable. | Automated coverage proves unknown runs still return a not-found style result without throwing and without calling shared cleanup. | `R-004` |

## Requirement Coverage Map To Use Cases

| requirement_id | use_case_ids |
| --- | --- |
| `R-001` | `UC-001`, `UC-002` |
| `R-002` | `UC-002` |
| `R-003` | `UC-001`, `UC-002`, `UC-003` |
| `R-004` | `UC-004` |

## Constraints / Dependencies

- The runtime adapter boundary in `runtime-command-ingress-service.ts` should remain the canonical place for runtime-specific terminate behavior.
- Existing GraphQL API shape for `terminateAgentRun` should remain stable.
- The refactor should remove terminate-path selection from the GraphQL resolver instead of adding more runtime-specific conditionals there.
- Run history and runtime session store behavior must remain compatible with continue/restore flows.
- Native `autobyteus` active-agent removal semantics must remain intact unless a deeper native adapter parity refactor is explicitly taken on.

## Open Questions / Risks

- Native runs do also have runtime-session records today, so the routing decision must inspect `runtimeKind`, not just session presence.
- Existing tests currently emphasize success outcomes, not exact routing or duplicate-cleanup prevention.
- A future cleanup could bring `AutobyteusRuntimeAdapter.terminateRun(...)` to full native-removal parity, but that deeper unification is not required for this slice.
