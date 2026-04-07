# Requirements

- Ticket: `external-turn-reply-aggregation`
- Status: `Design-ready`
- Scope Classification: `Medium`
- Last Updated: `2026-04-07`

## Goal

Ensure external channels publish one final reply per logical turn, where that final reply contains the accumulated assistant-visible text produced across all LLM legs in the turn, including text emitted before and after tool calls.

## Problem Statement

The accepted external-channel receipt recovery path can publish a persisted assistant trace before a tool-using turn finishes. Because callback delivery and receipt state are one-shot per turn, that early partial publish closes the receipt and prevents the later same-turn continuation from being sent.

## In-Scope Use Cases

- `UC-001`: Single-run external-channel turn with assistant text before and after one or more tool calls.
- `UC-002`: Single-run external-channel turn with no usable persisted reply yet, requiring live observation until `TURN_COMPLETED`.
- `UC-003`: Same-turn recovery after observation retry or delayed completion, where the final reply is resolved after the initial accepted receipt pass.
- `UC-004`: Single-leg turn with no tool call, which must continue to publish successfully without regression.

## Requirements

| Requirement ID | Description | Covered Use Cases |
| --- | --- | --- |
| `R-001` | External-channel delivery remains one publish per logical turn under the current contract. | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-002` | The one published reply for a tool-using turn must contain the accumulated assistant-visible text from all LLM legs in that turn. | `UC-001`, `UC-003` |
| `R-003` | The accepted-receipt runtime must not treat a partial persisted assistant trace from an unfinished turn as immediately publishable final output when live observation for that turn is still available. | `UC-001`, `UC-002` |
| `R-004` | Callback deduplication and receipt lifecycle guarantees must remain intact for the final turn reply. | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | Existing single-leg and fully completed-turn publication paths must remain functional. | `UC-004`, `UC-003` |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID(s) | Description | Scenario Intent |
| --- | --- | --- | --- |
| `AC-001` | `R-001`, `R-002` | Given a turn with assistant text, then a tool call, then more assistant text, the published external reply contains the combined same-turn text and is sent once. | Multi-leg same-turn aggregation |
| `AC-002` | `R-003` | The accepted-receipt recovery path does not publish and route the receipt solely from the first persisted pre-tool assistant leg when the turn is still live. | No premature publish from unfinished turn |
| `AC-003` | `R-004` | The outbox and callback pipeline still deduplicate the final per-turn publish and do not enqueue duplicate callbacks for the same completed turn. | Dedupe preserved |
| `AC-004` | `R-005` | Single-leg turns and completed-turn recovery still publish successfully after the fix. | Regression safety |

## Constraints / Dependencies

- Current contract is one external publish per turn, enforced by callback idempotency key and receipt state transitions.
- Live observation already aggregates same-turn text and publishes on `TURN_COMPLETED`; the fix should align recovery behavior to that contract rather than introducing multi-publish semantics.
- The implementation should stay within `autobyteus-server-ts` unless design review proves a server-side-only fix is insufficient.

## Assumptions

- `TURN_COMPLETED` remains the authoritative signal that a live turn is complete.
- Assistant raw traces persisted per LLM leg are valid internal runtime artifacts and do not need to change for this fix.
- Team-run behavior should follow the same one-publish-per-turn rule, even if initial implementation focus is the single-run path.

## Open Questions / Risks

- Whether the persisted recovery service itself should be hardened now or only the accepted-receipt runtime ordering should change.
- Whether the team-run accepted receipt path requires identical treatment in the same patch set.

## Requirement To Use-Case Coverage

| Requirement ID | Use Case IDs |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-002` | `UC-001`, `UC-003` |
| `R-003` | `UC-001`, `UC-002` |
| `R-004` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-005` | `UC-003`, `UC-004` |

## Acceptance-Criteria To Scenario Intent Mapping

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Validate that multi-leg same-turn replies are accumulated into the one final external publish. |
| `AC-002` | Validate that premature persisted assistant traces do not close the receipt before live turn completion. |
| `AC-003` | Validate that the final reply still uses one callback idempotency slot and does not duplicate delivery. |
| `AC-004` | Validate non-tool and completed-turn fallback behavior after the change. |
