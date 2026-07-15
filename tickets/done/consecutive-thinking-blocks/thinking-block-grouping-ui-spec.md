# Thinking Block Grouping UI Specification

- **Canonical path:** `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md`
- **Scope:** User-visible grouping of reasoning summaries in live and reloaded agent/team conversations.
- **Status:** `Deep Current-Base Redesign — User Approved for Architecture Re-review`
- **Related requirements:** `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`–`REQ-CTB-011`
- **Related acceptance criteria:** `AC-CTB-003`–`AC-CTB-013`
- **Relationship to mandatory artifacts:** Clarifies the observable grouping rule defined in `requirements.md`; implementation ownership and protocol identity are defined in `design-spec.md`.

## User Journey

1. A user sends a message to a single agent or team member with reasoning enabled.
2. The runtime consumes one or more completed reasoning-summary item snapshots while the agent works. Real-time `summaryTextDelta` frames are intentionally ignored.
3. The conversation shows one collapsed/expandable **Thinking** card for each contiguous run of reasoning.
4. If the Codex event stream creates a new ordered tool/non-reasoning card, emits assistant text, crosses a turn lifecycle boundary, or terminates with an error, the next reasoning content starts a new **Thinking** card.
5. If an already-positioned tool card later receives a result, status, log, approval-state, or completion update, reasoning before and after that update remains in the same **Thinking** card because no new card was inserted between it.
6. Reloading the run preserves the same visible block boundaries.

## Grouping Rule

A **contiguous reasoning block** is the maximal ordered sequence of non-empty reasoning fragments that:

- belongs to the same agent run and turn;
- has no intervening event that creates a new ordered conversation entry (new tool/non-reasoning card, assistant text, turn lifecycle boundary, or terminal runtime error); and
- preserves source fragment order.

Provider response-item IDs and transport chunk boundaries are not, by themselves, user-visible block boundaries.
`item/reasoning/summaryTextDelta` is permanently unsupported and creates no content, card, loading state, or block-state transition.
Provider maintenance, status, progress, token-usage, diff, compaction, and ignored events that do not create transcript content are not user-visible block boundaries either.
Tool results, logs, statuses, and completions that mutate an existing card at its original position are not user-visible block boundaries at their arrival time.

### Examples

| Source order | Expected visible order |
| --- | --- |
| reasoning A -> reasoning B -> reasoning C -> assistant text | Thinking(A+B+C) -> assistant text |
| reasoning A -> new tool call -> reasoning B -> assistant text | Thinking(A) -> tool -> Thinking(B) -> assistant text |
| reasoning A -> assistant commentary -> reasoning B -> final text | Thinking(A) -> commentary -> Thinking(B) -> final text |
| turn 1 reasoning -> turn 1 final -> turn 2 reasoning | Thinking(turn 1) -> final -> Thinking(turn 2) |
| reasoning A -> compaction/status/progress -> reasoning B -> assistant text | Thinking(A+B) -> assistant text |
| tool call -> reasoning A -> matching tool result update -> reasoning B -> next tool call | tool -> Thinking(A+B) -> next tool |
| reasoning A -> result-first tool event that creates a missing card -> reasoning B | Thinking(A) -> inferred tool -> Thinking(B) |
| summaryTextDelta("partial") -> completed reasoning snapshot A | no card/content from delta -> Thinking(A) once |
| reasoning A -> unseen terminal(identity/name, no args) -> reasoning B -> later matching ready terminal | Thinking(A) -> synthesized tool card -> Thinking(B); later terminal updates that card without moving the boundary |

## Content Joining

- Preserve every supported non-empty completed summary snapshot exactly once and in source order.
- Join completed reasoning summary fragments with the existing semantic separator used by the runtime/history projection (normally a blank-line separator) rather than concatenating words without spacing.
- Do not display or persist `item/reasoning/summaryTextDelta`; completed item snapshots are the sole supported content source.
- Never merge across agent runs, team members, turns, or events that create a new ordered tool/non-reasoning, assistant-text, or terminal lifecycle entry.
- Every post-boundary Thinking card has a different normalized identity even if Codex omits or repeats a provider item/event ID.

## Live State

- The first non-empty completed snapshot creates the card.
- Later adjacent completed snapshots update the existing card rather than creating sibling cards.
- The card remains usable as completed snapshots arrive; no additional loading indicator is required for ignored text deltas.
- Empty reasoning lifecycle events do not create a card.

## Reloaded / Historical State

- Runs produced after this fix whose ordered boundaries have durable normalized evidence render with the same boundaries before and after reload.
- Pre-fix historical runs are out of scope and may retain their current card boundaries.
- Explicit latest-base exception: if a tool card was observed with no authoritative arguments and the process crashes or the turn is abandoned before any physical call can be persisted, that transient observation has no durable evidence. Reload must not fabricate the missing card or promise exact boundary parity for that case.

## Error, Empty, Disabled, Permission, Responsive, Accessibility

- **Error:** Existing error rendering remains unchanged. A terminal runtime error clears backend reasoning state as lifecycle cleanup; the UI does not infer grouping from error-card DOM state.
- **Empty:** Empty reasoning fragments remain invisible.
- **Thinking disabled:** No behavior change; no reasoning card is created when no reasoning is emitted.
- **Permissions:** No permission behavior changes.
- **Responsive:** No layout or breakpoint changes; fewer redundant cards reduce vertical space.
- **Accessibility:** The existing Thinking disclosure label, focus behavior, and expanded/collapsed semantics remain unchanged; grouping must not create nested disclosures or duplicate labels.

## Approval

The user verified the packaged candidate on 2026-07-11 and rejected the remaining consecutive cards. The revised rule follows the visible ordered conversation: a new card is a boundary; a matching lifecycle update to an earlier card is not. Frontend production remains generic and does not infer Codex event families.

The user approved this revised ordered-card behavior on 2026-07-11 and authorized architecture re-review.

Architecture Round 3 requested explicit completed-snapshot-only/no-delta language. After reviewing why delta/snapshot reconciliation would add complexity without meaningful product benefit, the user approved this clarification and authorized architecture re-review on 2026-07-11.

Latest-base integration requires the evidence-free deferred-observation reload exception above. It does not alter normal completed tool lifecycles or the ordered-card rule. The user approved this exception on 2026-07-11.

Architecture Round 5 additionally clarified that an unseen terminal with valid identity/name creates the card immediately even when arguments are absent. That first terminal is therefore the visible boundary; a later matching ready terminal must not move it. The current-base redesign preserves that behavior through an extracted memory sequencer rather than a conditional accumulator patch; the user approved this package for architecture re-review on 2026-07-11.
