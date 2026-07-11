# Thinking Block Grouping UI Specification

- **Canonical path:** `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md`
- **Scope:** User-visible grouping of reasoning summaries in live and reloaded agent/team conversations.
- **Status:** `Approved User Direction — Architecture Round 1 Boundary Clarification Applied`
- **Related requirements:** `REQ-CTB-002`, `REQ-CTB-003`, `REQ-CTB-004`, `REQ-CTB-005`, `REQ-CTB-008`
- **Related acceptance criteria:** `AC-CTB-003`, `AC-CTB-004`, `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-007`, `AC-CTB-009`
- **Relationship to mandatory artifacts:** Clarifies the observable grouping rule defined in `requirements.md`; implementation ownership and protocol identity are defined in `design-spec.md`.

## User Journey

1. A user sends a message to a single agent or team member with reasoning enabled.
2. The runtime emits one or more reasoning summary items while the agent works.
3. The conversation shows one collapsed/expandable **Thinking** card for each contiguous run of reasoning.
4. If the Codex event stream reaches transcript-producing tool/non-reasoning activity, assistant text, a turn lifecycle boundary, or a terminal runtime error, the next reasoning content starts a new **Thinking** card.
5. Reloading the run preserves the same visible block boundaries.

## Grouping Rule

A **contiguous reasoning block** is the maximal ordered sequence of non-empty reasoning fragments that:

- belongs to the same agent run and turn;
- has no intervening normalized transcript boundary event (transcript-producing tool/non-reasoning activity, assistant text, turn lifecycle boundary, or terminal runtime error); and
- preserves source fragment order.

Provider response-item IDs and transport chunk boundaries are not, by themselves, user-visible block boundaries.
Provider maintenance, status, progress, token-usage, diff, compaction, and ignored events that do not create transcript content are not user-visible block boundaries either.

### Examples

| Source order | Expected visible order |
| --- | --- |
| reasoning A -> reasoning B -> reasoning C -> assistant text | Thinking(A+B+C) -> assistant text |
| reasoning A -> tool -> reasoning B -> assistant text | Thinking(A) -> tool -> Thinking(B) -> assistant text |
| reasoning A -> assistant commentary -> reasoning B -> final text | Thinking(A) -> commentary -> Thinking(B) -> final text |
| turn 1 reasoning -> turn 1 final -> turn 2 reasoning | Thinking(turn 1) -> final -> Thinking(turn 2) |
| reasoning A -> compaction/status/progress -> reasoning B -> assistant text | Thinking(A+B) -> assistant text |
| reasoning A -> approval/local tool/tool log -> reasoning B | Thinking(A) -> tool lifecycle -> Thinking(B) |

## Content Joining

- Preserve every non-empty fragment exactly once and in source order.
- Join completed reasoning summary fragments with the existing semantic separator used by the runtime/history projection (normally a blank-line separator) rather than concatenating words without spacing.
- Streaming deltas belonging to the same upstream reasoning item continue to append without inserting artificial separators.
- Never merge across agent runs, team members, turns, or the defined transcript-producing tool/non-reasoning, assistant-text, and terminal lifecycle boundaries.
- Every post-boundary Thinking card has a different normalized identity even if Codex omits or repeats a provider item/event ID.

## Live State

- The first non-empty fragment creates the card.
- Later adjacent fragments update the existing card rather than creating sibling cards.
- The card remains usable while content streams; no additional loading indicator is required.
- Empty reasoning lifecycle events do not create a card.

## Reloaded / Historical State

- Runs produced after this fix render with the same boundaries before and after reload.
- Pre-fix historical runs are out of scope and may retain their current card boundaries.

## Error, Empty, Disabled, Permission, Responsive, Accessibility

- **Error:** Existing error rendering remains unchanged. A terminal runtime error clears backend reasoning state as lifecycle cleanup; the UI does not infer grouping from error-card DOM state.
- **Empty:** Empty reasoning fragments remain invisible.
- **Thinking disabled:** No behavior change; no reasoning card is created when no reasoning is emitted.
- **Permissions:** No permission behavior changes.
- **Responsive:** No layout or breakpoint changes; fewer redundant cards reduce vertical space.
- **Accessibility:** The existing Thinking disclosure label, focus behavior, and expanded/collapsed semantics remain unchanged; grouping must not create nested disclosures or duplicate labels.

## Approval

The user approved the future-runs-only direction on 2026-07-11. The Round 1 clarification makes the already intended tool/text/turn semantics explicit for maintenance, early-return tool, and terminal lifecycle event families without adding frontend grouping logic.
